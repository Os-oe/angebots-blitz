/* ============================================================
   Angebots-Blitz — App-Logik
   Stage-Szenarien (statisch, kein API-Call) + Live-Mikro-Pfad.
   ?fast=1 beschleunigt alle Animationen (Playwright-Suite).
   ============================================================ */
(function () {
  "use strict";

  var FAST = /[?&]fast=1/.test(location.search);
  var T = FAST ? 0.04 : 1; // globaler Zeit-Multiplikator

  var fmt = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function eur(n) { return fmt.format(n) + " €"; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function $(sel) { return document.querySelector(sel); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms * T); }); }

  /* ---------- Scroll-Reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- Hero Count-ups ---------- */
  var statIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      statIO.unobserve(e.target);
      var el = e.target, target = parseInt(el.getAttribute("data-count"), 10);
      var t0 = performance.now(), dur = 1200 * T || 1;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".stat-num").forEach(function (el) { statIO.observe(el); });

  /* ---------- Brand-Wechsler ---------- */
  var currentBrand = window.BRANDS.muster;
  var chipsWrap = $("#brand-chips");
  Object.keys(window.BRANDS).forEach(function (key) {
    var b = window.BRANDS[key];
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "brand-chip" + (key === "muster" ? " active" : "");
    chip.setAttribute("data-brand", key);
    chip.setAttribute("data-testid", "brand-" + key);
    chip.innerHTML = '<span class="chip-dot" style="background:' + b.color + '">' + b.mono + "</span>" + b.name;
    chip.addEventListener("click", function () { applyBrand(key); });
    chipsWrap.appendChild(chip);
  });

  function applyBrand(key) {
    var b = window.BRANDS[key];
    currentBrand = b;
    document.querySelectorAll(".brand-chip").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-brand") === key);
    });
    var doc = $("#doc");
    doc.style.setProperty("--brand-color", b.color);
    $("#doc-logo").textContent = b.mono;
    $("#doc-logo").style.background = b.color;
    $("#doc-firm-name").textContent = b.name;
    $("#doc-firm-tagline").textContent = b.tagline;
    $("#doc-firm-meta").innerHTML = b.strasse + " · " + b.ort + "<br>Tel. " + b.tel + "<br>" + b.mail;
    $("#doc-sender-line").textContent = b.name + " · " + b.strasse + " · " + b.ort;
    $("#doc-sign-name").textContent = b.name;
    $("#doc-sign-name").style.color = b.color;
    $("#doc-sign-meta").textContent = "USt-IdNr. " + b.ust + " · Handwerksrolle: fiktiver Demo-Eintrag";
  }

  /* ---------- PDF (print-CSS) ---------- */
  $("#pdf-btn").addEventListener("click", function () { window.print(); });

  /* ---------- Kachel-Audio (optional, TTS-Clips) ---------- */
  var audioEl = null;
  function playClip(id) {
    stopClip();
    var a = new Audio("assets/audio/" + id + ".mp3");
    a.addEventListener("error", function () { audioEl = null; }); // kein Clip → stiller Ticker
    a.play().catch(function () {});
    audioEl = a;
  }
  function stopClip() {
    if (audioEl) { try { audioEl.pause(); } catch (e) {} audioEl = null; }
  }

  /* ---------- Dokument rendern ---------- */
  var runToken = 0; // bricht laufende Animationen ab, wenn neu geklickt wird

  function computeSums(positionen) {
    var netto = 0, mat = 0, lohn = 0, psch = 0;
    positionen.forEach(function (p) {
      var gp = round2(p.menge * p.ep);
      netto = round2(netto + gp);
      if (p.typ === "material") mat = round2(mat + gp);
      else if (p.typ === "lohn") lohn = round2(lohn + gp);
      else psch = round2(psch + gp);
    });
    var ust = round2(netto * 0.19);
    return { netto: netto, ust: ust, brutto: round2(netto + ust), material: mat, lohn: lohn, pauschale: psch };
  }

  function bindefristDatum(d) {
    var f = new Date(d.getTime() + 28 * 864e5);
    return f.toLocaleDateString("de-DE");
  }

  async function countUp(el, target, dur, token) {
    var t0 = performance.now(); dur = Math.max(dur * T, 1);
    return new Promise(function (resolve) {
      (function tick(now) {
        if (token !== runToken) return resolve();
        var p = Math.min(1, (now - t0) / dur);
        el.textContent = eur(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick); else { el.textContent = eur(target); resolve(); }
      })(t0);
    });
  }

  async function typewriter(el, text, totalMs, token) {
    el.innerHTML = '<span class="caret"></span>';
    var caret = el.querySelector(".caret");
    var step = Math.max((totalMs * T) / Math.max(text.length, 1), FAST ? 0 : 6);
    for (var i = 0; i < text.length; i++) {
      if (token !== runToken) return;
      caret.insertAdjacentText("beforebegin", text[i]);
      if (!FAST) await sleep(step / T); // step ist schon skaliert
    }
    caret.remove();
    if (FAST) el.textContent = text;
  }

  /* Haupt-Show: Transkript tickt → KI-Schritte → Positionen poppen → Summen zählen */
  async function runScenario(quote, opts) {
    opts = opts || {};
    var token = ++runToken;
    var stage = $("#demo");
    stage.hidden = false;
    stage.scrollIntoView({ behavior: FAST ? "auto" : "smooth", block: "start" });

    // Reset
    var oldBadge = $(".done-badge"); if (oldBadge) oldBadge.remove();
    $("#doc-positions").innerHTML = "";
    $("#doc-split").innerHTML = "";
    $("#sum-netto").textContent = eur(0);
    $("#sum-ust").textContent = eur(0);
    $("#sum-brutto").textContent = eur(0);
    $("#ki-steps").innerHTML = "";
    var wave = $("#voice-wave"); wave.classList.remove("idle");
    $("#voice-title").textContent = opts.live ? "Deine Aufnahme" : "Sprachnotiz · " + quote.label;
    $("#voice-state").textContent = "wird transkribiert …";
    $("#doc").classList.remove("done");

    // Kopf des Dokuments
    var heute = new Date();
    $("#doc-nr").textContent = quote.angebotsNr;
    $("#doc-datum").textContent = heute.toLocaleDateString("de-DE");
    $("#doc-bindefrist").textContent = bindefristDatum(heute) + " (4 Wochen)";
    $("#doc-kunde").textContent = quote.kunde || "Ihr Kunde";
    $("#doc-projekt").textContent = quote.title;
    if (quote.firma && window.BRANDS[quote.firma]) applyBrand(quote.firma);

    // 1) Transkript tickt sich ein (~8 s)
    if (!opts.live && !FAST) playClip(quote.id);
    await typewriter($("#voice-transcript"), quote.transcript, 8000, token);
    if (token !== runToken) return;
    wave.classList.add("idle");
    stopClip();

    // 2) KI-Schritte (~4 s)
    $("#voice-state").textContent = "KI kalkuliert …";
    var steps = [
      "Gewerk erkannt: " + quote.gewerk,
      quote.stundensatz ? "Stundenverrechnungssatz: " + quote.stundensatz + " €/h" : "Kalkulation über m²-Sätze",
      "Material +15 % Aufschlag einkalkuliert",
      "Positionen in Fachsprache formuliert"
    ];
    for (var s = 0; s < steps.length; s++) {
      if (token !== runToken) return;
      var st = document.createElement("div");
      st.className = "ki-step";
      st.innerHTML = '<span class="tick">✓</span>' + steps[s];
      $("#ki-steps").appendChild(st);
      requestAnimationFrame(function (el) { return function () { el.classList.add("in"); }; }(st));
      await sleep(900);
    }

    // 3) Positionen poppen nacheinander rein (~7 s)
    $("#voice-state").textContent = "Angebot wird aufgebaut …";
    var sums = computeSums(quote.positionen);
    var tbody = $("#doc-positions");
    var runningNetto = 0;
    for (var i = 0; i < quote.positionen.length; i++) {
      if (token !== runToken) return;
      var p = quote.positionen[i];
      var gp = round2(p.menge * p.ep);
      runningNetto = round2(runningNetto + gp);
      var tr = document.createElement("tr");
      tr.className = "pos-row";
      tr.innerHTML =
        "<td>" + (p.pos || i + 1) + "</td>" +
        '<td class="pos-desc">' + p.beschreibung + '<br><span class="pos-typ ' + p.typ + '">' + p.typ + "</span></td>" +
        '<td class="num">' + fmt.format(p.menge).replace(",00", "") + "</td>" +
        "<td>" + p.einheit + "</td>" +
        '<td class="num">' + fmt.format(p.ep) + "</td>" +
        '<td class="num">' + fmt.format(gp) + "</td>";
      tbody.appendChild(tr);
      requestAnimationFrame(function (el) { return function () { el.classList.add("in"); }; }(tr));
      countUp($("#sum-netto"), runningNetto, 500, token);
      await sleep(1100);
    }

    // 4) Summen zählen final hoch (~3 s)
    $("#voice-state").textContent = "Summen werden geprüft …";
    var splitParts = [];
    if (sums.material) splitParts.push("Material: <b>" + eur(sums.material) + "</b>");
    if (sums.lohn) splitParts.push("Lohn: <b>" + eur(sums.lohn) + "</b>");
    if (sums.pauschale) splitParts.push("Pauschalen/Anfahrt: <b>" + eur(sums.pauschale) + "</b>");
    $("#doc-split").innerHTML = splitParts.join("<span aria-hidden='true'> · </span>");
    await countUp($("#sum-netto"), sums.netto, 900, token);
    await countUp($("#sum-ust"), sums.ust, 700, token);
    await countUp($("#sum-brutto"), sums.brutto, 1100, token);
    if (token !== runToken) return;

    // Fertig
    $("#voice-state").textContent = "Fertig.";
    $("#doc").classList.add("done");
    var badge = document.createElement("div");
    badge.className = "done-badge";
    badge.setAttribute("data-testid", "done-badge");
    badge.innerHTML = "✓ Angebot fertig — aus einer Sprachnotiz" + (opts.live ? "" : ", in unter 30 Sekunden");
    $("#doc-toolbar").parentNode.insertBefore(badge, $("#doc-toolbar"));
  }

  /* ---------- Kacheln ---------- */
  document.querySelectorAll(".tile").forEach(function (tile) {
    tile.addEventListener("click", function () {
      document.querySelectorAll(".tile").forEach(function (t) { t.classList.remove("playing"); });
      tile.classList.add("playing");
      var sc = window.SCENARIOS[tile.getAttribute("data-scenario")];
      runScenario(sc, { live: false });
    });
  });

  /* ============================================================
     Live-Pfad: MediaRecorder → POST /api/quote → selbes Template
     ============================================================ */
  var recBtn = $("#rec-btn"), recLabel = $("#rec-label"), recTimer = $("#rec-timer"), liveStatus = $("#live-status");
  var mediaRecorder = null, chunks = [], recStart = 0, timerIv = null;
  var MAX_SEC = 60;

  function setStatus(msg, isError) {
    liveStatus.textContent = msg;
    liveStatus.classList.toggle("error", !!isError);
  }

  function fallbackToStage(reason) {
    setStatus(reason + " — Die drei Beispiel-Angebote oben zeigen dir alles. Live-Demo gibt's im Erstgespräch.", true);
    recBtn.disabled = false;
    recLabel.textContent = "Aufnahme starten";
    recBtn.classList.remove("recording");
    recTimer.hidden = true;
  }

  recBtn.addEventListener("click", async function () {
    if (mediaRecorder && mediaRecorder.state === "recording") { mediaRecorder.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return fallbackToStage("Dein Browser unterstützt keine Aufnahme");
    }
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return fallbackToStage("Mikrofon nicht freigegeben");
    }
    var mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""].find(function (m) {
      return !m || MediaRecorder.isTypeSupported(m);
    }) || "";
    chunks = [];
    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      clearInterval(timerIv);
      recBtn.classList.remove("recording");
      recTimer.hidden = true;
      var blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      submitAudio(blob);
    };
    mediaRecorder.start();
    recStart = Date.now();
    recBtn.classList.add("recording");
    recLabel.textContent = "Aufnahme beenden";
    recTimer.hidden = false;
    setStatus("Sprich deinen Auftrag ein — Klick beendet die Aufnahme.");
    timerIv = setInterval(function () {
      var s = Math.floor((Date.now() - recStart) / 1000);
      recTimer.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      if (s >= MAX_SEC) mediaRecorder.stop();
    }, 250);
  });

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(",")[1]); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  async function submitAudio(blob) {
    if (blob.size < 1200) return fallbackToStage("Aufnahme zu kurz");
    if (blob.size > 2 * 1024 * 1024) return fallbackToStage("Aufnahme zu groß (max. 2 MB)");
    recBtn.disabled = true;
    recLabel.textContent = "Wird verarbeitet …";
    setStatus("KI hört zu und kalkuliert — dauert ein paar Sekunden …");
    try {
      var b64 = await blobToBase64(blob);
      var res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: b64,
          mime: blob.type || "audio/webm",
          duration: Math.round((Date.now() - recStart) / 1000)
        })
      });
      var data = await res.json().catch(function () { return null; });
      if (!res.ok || !data || !data.ok) {
        var msg = data && data.error ? data.error : "Live-Demo gerade nicht verfügbar";
        return fallbackToStage(msg);
      }
      var q = data.quote;
      // ins Stage-Format bringen — selbes Dokument-Template
      var quote = {
        id: "live",
        label: q.gewerk || "Live",
        title: q.titel || "Ihr Auftrag",
        gewerk: q.gewerk || "Handwerksleistung",
        firma: null,
        angebotsNr: "AB-2026-" + String(1000 + Math.floor(Math.random() * 9000)),
        kunde: q.kunde_kontext || "Ihr Kunde",
        stundensatz: q.stundensatz || null,
        transcript: q.transkript || "",
        positionen: (q.positionen || []).map(function (p, i) {
          return { pos: i + 1, beschreibung: p.beschreibung, menge: p.menge, einheit: p.einheit, ep: p.ep, typ: p.typ };
        })
      };
      recBtn.disabled = false;
      recLabel.textContent = "Nochmal aufnehmen";
      setStatus("Fertig — dein Angebot ist da. ↑");
      await runScenario(quote, { live: true });
    } catch (e) {
      fallbackToStage("Verbindung fehlgeschlagen");
    }
  }

  /* Test-Hooks */
  window.__ab = {
    runScenario: runScenario,
    computeSums: computeSums,
    applyBrand: applyBrand,
    fallbackToStage: fallbackToStage,
    submitAudio: submitAudio
  };
})();
