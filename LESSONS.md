# Lessons — Angebots-Blitz Build (2026-06-11)

one-prompt-kit · Lauf 3 (autonom) · Rezept `app.md` · ~3,5 h Session, 0,30 € Ist-Kosten.

## Gemini Audio→Struktur (der Kern-Trick)

- **Ein Call reicht wirklich:** Audio als `inlineData` (camelCase!) + Prompt +
  `responseSchema` liefert Transkript UND fertiges Angebots-JSON in einem
  `generateContent`-Call. Kein separater STT-Schritt nötig.
- **webm/opus wird von Gemini akzeptiert** (offiziell nur ogg/mp3/wav/aiff/aac
  dokumentiert) — MediaRecorder-Output kann 1:1 durchgereicht werden, kein
  serverseitiges Transcoding.
- **Modell-ID vor dem Bauen mit dem echten Key per ListModels verifizieren**
  (hier: `gemini-3.5-flash` existiert, plus `gemini-2.5-flash` als Fallback-Kette
  im Handler). Raten = Deploy-Risiko.
- Server rechnet Netto/USt/Brutto IMMER selbst aus den Positionen — LLM-Mathe
  nie ins Dokument lassen.
- Key in den `x-goog-api-key`-Header, nicht als `?key=`-Query (Logging-Hygiene).

## Vercel

- `vercel env add NAME preview` ist im aktuellen CLI **interaktiv kaputt im
  Non-TTY-Modus** (verlangt Branch-Argument, akzeptiert aber auch `--value/--yes`
  nicht zuverlässig). Production ging via stdin-Pipe. Workaround wenn nötig:
  REST-API `POST /v10/projects/:id/env`.
- Domain-Attach via `POST /v10/projects/:id/domains` + Wildcard-CNAME: sofort
  `verified:true`, kein DNS-Wait.
- Test-Fixture-Audio mit macOS `say -v "Reed (Deutsch (Deutschland))"` + ffmpeg
  → libopus/webm: 0 €, deterministisch, klingt gut genug, dass Gemini ein
  sauberes Angebot draus baut.

## Demo-Architektur

- **Stage-Szenarien als statisches JSON + Live-Pfad ins selbe Template** ist das
  richtige Muster: die Show ist immer flüssig (kein API-Risiko beim ersten
  Eindruck), der Live-Pfad ist Opt-in-Conversion-Moment.
- Animations-Suite testbar machen über `?fast=1`-Zeitmultiplikator (T=0.04) —
  dieselbe Codepath, 25-s-Show läuft im Test in <1 s. Skip-Button nutzt denselben
  Mechanismus zur Laufzeit (`runSpeed`).
- `Intl.NumberFormat("de-DE")` liefert NBSP (\xa0) als Tausendertrennzeichen-
  Nachbar — Playwright-Assertions immer `.replace("\xa0", " ")` normalisieren.
- Print-CSS (`window.print()` + `@media print` nur das Dokument als A4) ersetzt
  jede PDF-Lib: 0 KB Ballast, echter System-Dialog, druckt den Briefkopf in
  Brand-Farbe.
- OG-Image als Playwright-Screenshot des Heros (1200×630): 0 €, brand-exakt.

## Kie TTS

- ElevenLabs-Multilingual-v2-Bridge wirft sporadisch „internal error" —
  **einfach retrien** (2 von 5 Calls schlugen fehl, beide Retries ok).
  budget-guard verbucht trotzdem pro Versuch (0,05 €) → Fails kosten.
- Voice `EkK5I93UQWFDigLMpZcX` (male, neutral) spricht überzeugendes Deutsch
  für Handwerker-Sprachnotizen; Stability 0.4 gibt natürliches Sprechtempo.

## Schutzschicht-Pattern (für jede öffentliche KI-Demo wiederverwendbar)

Origin/Referer-Lock (403) · Payload-Limits (2 MB/60 s, 413/415) · Tages-Cap
global + pro IP (429, In-Memory pro Instanz als dokumentierter Kompromiss) ·
JEDER Fehlerpfad antwortet `{fallback:true}` → Frontend fällt graceful auf die
Stage-Szenarien + „Live-Demo im Erstgespräch"-CTA zurück. Caps per Env
(`AB_DAILY_CAP=0`) testbar machen, ohne echte Calls zu verbrennen.

## Kosten (Ist)

| Posten | Menge | Ist |
|---|---|---|
| Kie TTS (3 Clips, 5 Versuche à 0,05 €, +1 Vorab-Check-Charge) | 6 Records | 0,30 € |
| Gemini Flash (ListModels + ~8 quote-Calls Build/Tests/Live) | — | 0,00 € (Free-Tier) |
| Bilder | 0 (Logo kopiert, OG = Screenshot, Icons = SVG) | 0,00 € |
| **Gesamt Build** | | **0,30 €** (Budget 10 €, Konzept-Schätzung ≤1 €) |
