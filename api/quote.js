/* /api/quote — Sprachnotiz → Angebots-JSON in EINEM Gemini-Call.
 *
 * Schutzschicht (CONCEPT §4):
 *  - Origin/Referer-Lock auf eigene Domains (sonst 403)
 *  - Audio max 60 s / 2 MB serverseitig
 *  - Tages-Cap: In-Memory-Zähler pro Function-Instanz (dokumentierter
 *    Kompromiss — Vercel Blob bräuchte einen eigenen Store; der Gemini-Key
 *    hat zusätzlich ein niedriges Quota als zweite Leine). Bei Cap/Fehler
 *    antwortet das Frontend graceful mit den Stage-Szenarien.
 *  - Audio wird NICHT gespeichert, nur durchgereicht (DSGVO-Zeile im UI).
 *
 * Gemini-Falle: Request-Felder sind camelCase (inlineData/mimeType/
 * responseMimeType) — snake_case wird stillschweigend ignoriert.
 */

const ALLOWED_HOSTS = [
  "angebots-blitz.demo.osai.solutions",
  "localhost",
  "127.0.0.1"
];
// Vercel-Preview-Deploys (angebots-blitz-*.vercel.app) ebenfalls erlauben
const VERCEL_RE = /^angebots-blitz[a-z0-9-]*\.vercel\.app$/;

const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"]; // Fallback-Kette
const MAX_BYTES = 2 * 1024 * 1024;
const MIN_BYTES = 10 * 1024; // darunter ist keine verwertbare Sprachnotiz drin
const MAX_SECONDS = 60;
const MIN_SECONDS = 2;
const DAILY_CAP = Number(process.env.AB_DAILY_CAP || 40); // globaler Tages-Cap pro Instanz
const IP_CAP = Number(process.env.AB_IP_CAP || 5);        // pro IP und Tag

// In-Memory-Counter (Kompromiss, s. o.)
const state = { day: "", count: 0, perIp: new Map() };

const PROMPT = `Du bist ein erfahrener deutscher Handwerksmeister und Kalkulator.
Du bekommst eine Sprachnotiz eines Handwerkers über einen Auftrag.
Aufgaben (in EINEM Schritt):
1. Transkribiere die Notiz sinngemäß sauber (Feld "transkript", max 600 Zeichen).
2. Erkenne das Gewerk und erstelle ein professionelles Angebot mit 3-8 Positionen.
Regeln:
- Positionen in echter Handwerker-Fachsprache (z. B. "Einhebelmischer demontieren und montieren inkl. Eckventile prüfen", NICHT "Wasserhahn tauschen").
- Material und Lohn als getrennte Positionen, Anfahrt als eigene Position (typ "pauschale").
- Realistische deutsche Marktpreise 2026: Stundenverrechnungssatz je Gewerk 60-85 €/h, Materialaufschlag ca. 15 % einkalkuliert.
- "menge" × "ep" ergibt den Positionspreis; ep in Euro netto.
- "einheit" aus: Stk., Std., m², m, psch.
- "typ" aus: material, lohn, pauschale.
- "titel": kurzer Projekttitel (z. B. "Waschtisch-Austausch im Bad").
- "kunde_kontext": Kunde/Ort falls genannt, sonst leer. NIEMALS einen Kunden oder Ort erfinden.
- Wenn die Aufnahme KEIN Handwerksauftrag ist, setze "gewerk" auf "unklar" und positionen auf [].
- Wenn das Audio unverständlich oder leer ist oder keinen Handwerksauftrag beschreibt, antworte mit {"error": "unverstaendlich"} — setze dazu "error" auf "unverstaendlich", "gewerk" auf "unklar" und "positionen" auf []. Erfinde in diesem Fall NICHTS.
Antworte NUR mit dem JSON.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    error: { type: "STRING" },
    transkript: { type: "STRING" },
    gewerk: { type: "STRING" },
    titel: { type: "STRING" },
    kunde_kontext: { type: "STRING" },
    stundensatz: { type: "NUMBER" },
    positionen: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          beschreibung: { type: "STRING" },
          menge: { type: "NUMBER" },
          einheit: { type: "STRING" },
          ep: { type: "NUMBER" },
          typ: { type: "STRING", enum: ["material", "lohn", "pauschale"] }
        },
        required: ["beschreibung", "menge", "einheit", "ep", "typ"]
      }
    }
  },
  required: ["transkript", "gewerk", "titel", "positionen"]
};

function hostOf(value) {
  try { return new URL(value).hostname; } catch (e) { return ""; }
}

function originAllowed(req) {
  const src = req.headers.origin || req.headers.referer || "";
  const host = hostOf(src);
  return ALLOWED_HOSTS.includes(host) || VERCEL_RE.test(host);
}

function capExceeded(req) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) { state.day = today; state.count = 0; state.perIp.clear(); }
  const ip = (req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
  const ipCount = state.perIp.get(ip) || 0;
  if (state.count >= DAILY_CAP || ipCount >= IP_CAP) return true;
  state.count += 1;
  state.perIp.set(ip, ipCount + 1);
  return false;
}

async function callGemini(apiKey, model, mime, base64Audio) {
  // Key im Header statt in der URL — taucht so in keinem Request-Log auf
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: mime, data: base64Audio } }, // camelCase!
        { text: PROMPT }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: leere Antwort");
  return JSON.parse(text);
}

function validQuote(q) {
  if (!q || typeof q !== "object") return false;
  if (q.error) return false; // Gemini meldet „unverstaendlich" → ehrlicher Fallback statt Halluzination
  if (!Array.isArray(q.positionen)) return false;
  if (q.gewerk === "unklar" || q.positionen.length === 0) return false;
  return q.positionen.every(p =>
    p && typeof p.beschreibung === "string" && p.beschreibung.length > 3 &&
    typeof p.menge === "number" && p.menge > 0 &&
    typeof p.ep === "number" && p.ep >= 0 &&
    ["material", "lohn", "pauschale"].includes(p.typ)
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Nur POST" });
  }
  if (!originAllowed(req)) {
    return res.status(403).json({ ok: false, error: "Zugriff nur über die Demo-Seite" });
  }

  const apiKey = process.env.GOOGLE_AI_STUDIO;
  if (!apiKey) {
    return res.status(503).json({ ok: false, fallback: true, error: "Live-Demo gerade nicht konfiguriert" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const audio = body && body.audio;
  const mime = (body && body.mime) || "audio/webm";
  const duration = (body && Number(body.duration)) || 0;

  if (!audio || typeof audio !== "string") {
    return res.status(400).json({ ok: false, error: "Kein Audio empfangen" });
  }
  const bytes = Math.floor(audio.length * 0.75);
  if (bytes > MAX_BYTES) {
    return res.status(413).json({ ok: false, fallback: true, error: "Aufnahme zu groß (max. 2 MB)" });
  }
  if (bytes < MIN_BYTES) {
    return res.status(422).json({ ok: false, fallback: true, error: "Da war kein verständlicher Auftrag zu hören — sprich bitte ein paar Sätze" });
  }
  if (duration > MAX_SECONDS + 3) {
    return res.status(413).json({ ok: false, fallback: true, error: "Aufnahme zu lang (max. 60 s)" });
  }
  if (duration > 0 && duration < MIN_SECONDS) {
    return res.status(422).json({ ok: false, fallback: true, error: "Aufnahme zu kurz — sprich bitte ein paar Sätze" });
  }
  if (!/^audio\/(webm|ogg|mp4|mpeg|mp3|wav|aac|x-m4a)/.test(mime)) {
    return res.status(415).json({ ok: false, fallback: true, error: "Audioformat nicht unterstützt" });
  }
  if (capExceeded(req)) {
    return res.status(429).json({ ok: false, fallback: true, error: "Tages-Limit der Live-Demo erreicht" });
  }

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const quote = await callGemini(apiKey, model, mime, audio);
      if (!validQuote(quote)) {
        return res.status(422).json({ ok: false, fallback: true, error: "Da war kein Handwerksauftrag rauszuhören — probier's nochmal" });
      }
      return res.status(200).json({ ok: true, model, quote });
    } catch (e) {
      lastErr = e;
      if (e.status && e.status < 500 && e.status !== 429 && e.status !== 404) break; // harte Client-Fehler nicht retried
    }
  }
  console.error("quote-error:", lastErr && lastErr.message);
  return res.status(502).json({ ok: false, fallback: true, error: "Live-Demo gerade nicht erreichbar" });
};
