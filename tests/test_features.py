#!/usr/bin/env python3
"""Gate 2 — Features: /api/quote (Fixture → valides Schema), Origin-/Cap-Fail
graceful, PDF-Download-Assertion, Brand-Wechsler, Aufklapper, DSGVO.
Voraussetzung: dev-server auf :8742 (mit GOOGLE_AI_STUDIO) läuft bereits.
Ein zweiter Cap-Test-Server (AB_DAILY_CAP=0) wird selbst gestartet."""
import sys, os, json, base64, subprocess, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("AB_BASE", "http://127.0.0.1:8742")
CAP_PORT = 8743
SKIP_GEMINI = os.environ.get("AB_SKIP_GEMINI") == "1"  # echter Call kostet Quota

CHECKS = []
def check(name, cond, detail=""):
    CHECKS.append((name, bool(cond), detail))
    print(("  ✓ " if cond else "  ✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))

def post(url, payload, origin=None, timeout=90):
    headers = {"Content-Type": "application/json"}
    if origin: headers["Origin"] = origin
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}

def api_tests():
    fixture = base64.b64encode(open(os.path.join(ROOT, "fixtures/auftrag.webm"), "rb").read()).decode()
    good = {"audio": fixture, "mime": "audio/webm", "duration": 14}

    # 1) Origin-Lock: ohne/falscher Origin → 403
    code, d = post(BASE + "/api/quote", good, origin=None)
    check("Origin fehlt → 403", code == 403, str(code))
    code, d = post(BASE + "/api/quote", good, origin="https://evil.example.com")
    check("Fremder Origin → 403", code == 403, str(code))

    # 2) Größen-/Format-Guards
    code, d = post(BASE + "/api/quote", {"audio": "A" * (3 * 1024 * 1024), "mime": "audio/webm", "duration": 10}, origin=BASE)
    check("Audio > 2 MB → 413 + fallback", code == 413 and d.get("fallback"), f"{code} {d}")
    code, d = post(BASE + "/api/quote", {"audio": fixture, "mime": "audio/webm", "duration": 99}, origin=BASE)
    check("Dauer > 60 s → 413 + fallback", code == 413 and d.get("fallback"), f"{code} {d}")
    code, d = post(BASE + "/api/quote", {"audio": fixture, "mime": "video/mp4", "duration": 10}, origin=BASE)
    check("Falscher MIME → 415 + fallback", code == 415 and d.get("fallback"), f"{code} {d}")
    code, d = post(BASE + "/api/quote", {"mime": "audio/webm"}, origin=BASE)
    check("Kein Audio → 400", code == 400, str(code))

    # 2b) Müll-Audio: niemals erfundene Kundendaten ausliefern
    garbage = {"audio": base64.b64encode(b"xx").decode(), "mime": "audio/webm", "duration": 10}
    code, d = post(BASE + "/api/quote", garbage, origin=BASE)
    check("Müll-Audio (2 Byte) → 422 + fallback, kein quote", code == 422 and d.get("fallback") and "quote" not in d, f"{code} {d}")
    check("Müll-Audio: ehrliche Fehlermeldung", "verständlicher Auftrag" in d.get("error", ""), str(d))
    code, d = post(BASE + "/api/quote", {"audio": fixture, "mime": "audio/webm", "duration": 1}, origin=BASE)
    check("Dauer < 2 s → 422 + fallback", code == 422 and d.get("fallback"), f"{code} {d}")

    # 3) Tages-Cap (eigener Server mit AB_DAILY_CAP=0) → 429 + fallback
    env = dict(os.environ, AB_DAILY_CAP="0", GOOGLE_AI_STUDIO="dummy")
    proc = subprocess.Popen(["node", "dev-server.mjs", str(CAP_PORT)], cwd=ROOT, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.2)
        code, d = post(f"http://127.0.0.1:{CAP_PORT}/api/quote", good, origin=f"http://127.0.0.1:{CAP_PORT}")
        check("Tages-Cap erreicht → 429 + fallback", code == 429 and d.get("fallback"), f"{code} {d}")
    finally:
        proc.terminate()

    # 4) Echter Gemini-Call mit Fixture → valides Schema
    if SKIP_GEMINI:
        print("  ~ Gemini-Call übersprungen (AB_SKIP_GEMINI=1)")
    else:
        code, d = post(BASE + "/api/quote", good, origin=BASE)
        ok = code == 200 and d.get("ok") and isinstance(d.get("quote"), dict)
        check("Fixture → 200 + ok", ok, f"{code} {str(d)[:200]}")
        if ok:
            q = d["quote"]
            check("Schema: transkript", isinstance(q.get("transkript"), str) and len(q["transkript"]) > 20)
            check("Schema: gewerk + titel", bool(q.get("gewerk")) and bool(q.get("titel")))
            ps = q.get("positionen", [])
            check("Schema: 3-8 Positionen", 3 <= len(ps) <= 8, str(len(ps)))
            check("Schema: Positions-Felder + typ-Enum", all(
                isinstance(p.get("beschreibung"), str) and isinstance(p.get("menge"), (int, float)) and
                isinstance(p.get("ep"), (int, float)) and p.get("typ") in ("material", "lohn", "pauschale") and
                bool(p.get("einheit")) for p in ps))
            check("Anfahrt/pauschale enthalten", any(p["typ"] == "pauschale" for p in ps))

def ui_tests():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE + "/?fast=1", wait_until="networkidle")

        # Szenario laden, damit das Dokument steht
        page.click("[data-testid=tile-shk]")
        page.wait_for_selector("[data-testid=done-badge]", timeout=30000)

        # 5) PDF-Download: print() wird ausgelöst + Print-CSS vorhanden
        page.evaluate("window.__printed = 0; window.print = () => { window.__printed++; }; 1")
        page.click("[data-testid=pdf-btn]")
        check("PDF-Button löst print() aus", page.evaluate("window.__printed") == 1)
        css = page.evaluate("""() => {
          let txt = "";
          for (const sheet of document.styleSheets) {
            try { for (const r of sheet.cssRules) txt += r.cssText; } catch (e) {}
          }
          return txt.includes("@media print");
        }""")
        check("Print-CSS (@media print) vorhanden", css)

        # 6) Brand-Wechsler: live umschalten
        page.click("[data-testid=brand-blank]")
        check("Brand-Wechsel: Firmenname", page.text_content("#doc-firm-name") == "Elektro Blank GmbH")
        check("Brand-Wechsel: Monogramm", page.text_content("#doc-logo") == "EB")
        check("Brand-Wechsel: Signatur", "Elektro Blank" in page.text_content("#doc-sign-name"))
        color = page.evaluate("getComputedStyle(document.querySelector('#doc')).getPropertyValue('--brand-color').trim()")
        check("Brand-Wechsel: Farbe", color == "#e8a200", color)
        page.click("[data-testid=brand-muster]")
        check("Brand-Wechsel zurück", page.text_content("#doc-firm-name") == "Muster Haustechnik GmbH")

        # 7) „So kalkuliert die KI"-Aufklapper
        page.click("#calc-details summary")
        calc = page.text_content("#calc-details")
        check("Aufklapper: Stundenverrechnungssatz erklärt", "Stundenverrechnungssatz" in calc)
        check("Aufklapper: 15 % Materialaufschlag", "15" in calc and "Materialaufschlag" in calc.replace(" ", " "))
        check("Aufklapper: Quellen", "handwerk.cloud" in calc and "MyHammer" in calc)

        # 8) DSGVO-Zeile am Mikro
        dsgvo = page.text_content(".dsgvo-line")
        check("DSGVO-Einzeiler", "nicht gespeichert" in dsgvo)

        # 9) Frontend graceful: Fetch-Fail → Fallback-Hinweis statt Bruch
        page.evaluate("""() => {
          window.fetch = () => Promise.resolve({
            ok: false, status: 429,
            json: () => Promise.resolve({ ok: false, fallback: true, error: "Tages-Limit der Live-Demo erreicht" })
          });
          const blob = new Blob([new Uint8Array(5000)], { type: "audio/webm" });
          return window.__ab.submitAudio(blob);
        }""")
        page.wait_for_function("document.querySelector('[data-testid=live-status]').textContent.includes('Erstgespräch')", timeout=5000)
        status = page.text_content("[data-testid=live-status]")
        check("Cap-Fail → graceful Stage-Fallback + Erstgespräch-CTA", "Tages-Limit" in status and "Erstgespräch" in status, status)
        check("Record-Button wieder aktiv", page.evaluate("!document.querySelector('#rec-btn').disabled"))

        # 10) Excellence: Stage-Tabs wechseln das Szenario im Dokument
        page.click(".stage-tab[data-scenario=elektro]")
        page.wait_for_selector("[data-testid=done-badge]", timeout=30000)
        check("Stage-Tab wechselt Szenario", "AB-2026-1043" in page.text_content("[data-testid=doc-nr]"))
        check("Stage-Tab active-State", "active" in (page.get_attribute(".stage-tab[data-scenario=elektro]", "class") or ""))

        # 11) Excellence: „Dein Betrieb"-Chip übernimmt den eigenen Namen
        page.evaluate("window.prompt = () => 'Schreinerei Holzwurm GmbH'; 1")
        page.click("[data-testid=brand-custom]")
        check("Custom-Brand: Firmenname im Briefkopf", page.text_content("#doc-firm-name") == "Schreinerei Holzwurm GmbH")
        check("Custom-Brand: Monogramm SH", page.text_content("#doc-logo") == "SH")

        # 11b) Umlaute in der generierten Mail-Domain transliteriert (ä→ae ö→oe ü→ue ß→ss)
        page.evaluate("window.prompt = () => 'Müller & Söhne Straßenbau'; 1")
        page.click("[data-testid=brand-custom]")
        meta = page.text_content("#doc-firm-meta") or ""
        check("Custom-Brand: Umlaut-Mail transliteriert",
              "info@mueller-soehne-strassenbau.de" in meta, meta)

        check("keine JS-Pageerrors", not errors, "; ".join(errors[:3]))

        # 12) Excellence: Skip — „Direkt zum Ergebnis" beendet die Show in Sekunden
        slow = browser.new_page(viewport={"width": 1280, "height": 900})
        slow.goto(BASE + "/", wait_until="networkidle")  # OHNE fast=1
        slow.click("[data-testid=tile-maler]")
        slow.wait_for_selector("[data-testid=skip-btn]:visible", timeout=5000)
        # 12b) Kachel-Audio-Feedback: Pause-State während Wiedergabe, erneuter Klick stoppt
        check("Kachel-Audio: Pause-/Equalizer-State während Wiedergabe",
              "audio-on" in (slow.get_attribute("[data-testid=tile-maler]", "class") or ""))
        slow.click("[data-testid=tile-maler]")
        check("Kachel-Audio: erneuter Klick stoppt Wiedergabe",
              "audio-on" not in (slow.get_attribute("[data-testid=tile-maler]", "class") or ""))
        slow.wait_for_timeout(1200)
        slow.click("[data-testid=skip-btn]")
        try:
            slow.wait_for_selector("[data-testid=done-badge]", timeout=8000)
            check("Skip: Ergebnis in < 8 s statt ~25 s", True)
        except Exception:
            check("Skip: Ergebnis in < 8 s statt ~25 s", False)
        check("Skip: Summen trotzdem exakt", slow.text_content("[data-testid=sum-brutto]").replace("\xa0", " ").strip() == "1.096,35 €")
        slow.close()
        browser.close()

def main():
    print("— API —"); api_tests()
    print("— UI —"); ui_tests()
    failed = [c for c in CHECKS if not c[1]]
    print(f"\n{'GATE 2 GRÜN' if not failed else 'GATE 2 ROT'} — {len(CHECKS)-len(failed)}/{len(CHECKS)} Checks")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
