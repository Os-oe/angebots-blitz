#!/usr/bin/env python3
"""Gate 1 — MVP-Kern: 3 Stage-Szenarien end-to-end, Summen centgenau, Fachsprache.
Standalone (kein pytest): startet eigenen Static-Server, läuft headless."""
import sys, threading, functools, http.server, socketserver, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("AB_PORT", "8741"))
BASE = os.environ.get("AB_BASE", f"http://127.0.0.1:{PORT}")

EXPECT = {
    "shk":     {"netto": "1.039,00 €", "ust": "197,41 €", "brutto": "1.236,41 €",
                "fach": ["Einhebelmischer", "Dichtheitsprüfung", "Eckventile"]},
    "elektro": {"netto": "1.014,00 €", "ust": "192,66 €", "brutto": "1.206,66 €",
                "fach": ["DIN VDE 0100-600", "Stemm- und Schlitzarbeiten", "NYM-J 3x1,5"]},
    "maler":   {"netto": "921,30 €", "ust": "175,05 €", "brutto": "1.096,35 €",
                "fach": ["Oberflächengüte Q2", "Dispersionsfarbe", "Malervlies"]},
}
CHECKS = []
def check(name, cond, detail=""):
    CHECKS.append((name, bool(cond), detail))
    print(("  ✓ " if cond else "  ✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))

def start_server():
    if os.environ.get("AB_BASE"):  # externer Server (z. B. Live-URL)
        return None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def run(page):
    page.goto(BASE + "/?fast=1", wait_until="networkidle")

    # --- Statik: Hero, Kacheln, Footer-Brand
    check("Hero-Claim sichtbar", "Fertiges Angebot" in page.text_content(".hero-claim"))
    check("3 Kacheln vorhanden", page.locator(".tile").count() == 3)
    check("powered by OsAI im Footer", page.locator(".footer-brand img[alt='OsAI']").count() == 1)

    # --- computeSums gegen die fixierten Summen (Logik-Ebene)
    sums = page.evaluate("""() => {
      const out = {};
      for (const [k, sc] of Object.entries(window.SCENARIOS)) {
        const s = window.__ab.computeSums(sc.positionen);
        out[k] = { netto: s.netto, ust: s.ust, brutto: s.brutto,
                   fixNetto: sc.netto, fixUst: sc.ust, fixBrutto: sc.brutto };
      }
      return out;
    }""")
    for k, v in sums.items():
        check(f"{k}: computeSums == Konzept §3",
              v["netto"] == v["fixNetto"] and v["ust"] == v["fixUst"] and v["brutto"] == v["fixBrutto"],
              str(v))

    # --- Jedes Szenario end-to-end durch die UI
    for sid, exp in EXPECT.items():
        page.click(f"[data-testid=tile-{sid}]")
        page.wait_for_selector("[data-testid=done-badge]", timeout=30000)
        netto = page.text_content("[data-testid=sum-netto]").replace(" ", " ").strip()
        ust = page.text_content("[data-testid=sum-ust]").replace(" ", " ").strip()
        brutto = page.text_content("[data-testid=sum-brutto]").replace(" ", " ").strip()
        check(f"{sid}: Netto exakt {exp['netto']}", netto == exp["netto"], netto)
        check(f"{sid}: USt exakt {exp['ust']}", ust == exp["ust"], ust)
        check(f"{sid}: Brutto exakt {exp['brutto']}", brutto == exp["brutto"], brutto)
        check(f"{sid}: 5 Positionen", page.locator("#doc-positions tr").count() == 5)
        table = page.text_content("[data-testid=doc-table]")
        for kw in exp["fach"]:
            check(f"{sid}: Fachsprache „{kw}“", kw in table)
        check(f"{sid}: Material/Lohn-Split sichtbar", "Lohn:" in page.text_content("#doc-split"))
        check(f"{sid}: Transkript steht", len(page.text_content("[data-testid=transcript]") or "") > 80)
        check(f"{sid}: Bindefrist 4 Wochen", "4 Wochen" in page.text_content("#doc-bindefrist"))
        check(f"{sid}: Angebots-Nr gesetzt", "AB-2026-" in page.text_content("[data-testid=doc-nr]"))
        # KI-Schritte konsistent: Material-Schritt nur, wenn Material-Positionen existieren
        ki = page.text_content("#ki-steps") or ""
        has_material = sid in ("shk", "elektro")
        check(f"{sid}: Material-Schritt {'da' if has_material else 'weg (kein Material)'}",
              ("Material" in ki) == has_material, ki)
        if sid == "elektro":  # Positionen sind je Auslass kalkuliert, kein Stundensatz-Schritt
            check("elektro: KI-Schritt „Einheitspreise je Auslass“ statt Stundensatz",
                  "Einheitspreise je Auslass" in ki and "Stundenverrechnungssatz" not in ki, ki)

    # --- Dokument-Pflichtteile (CONCEPT §2.3)
    terms = page.text_content("#doc-terms")
    check("Zahlungsziel 14 Tage", "14 Tagen" in terms)
    check("Gewährleistung BGB", "BGB" in terms)

def main():
    from playwright.sync_api import sync_playwright
    httpd = start_server()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            run(page)
            check("keine JS-Pageerrors", not errors, "; ".join(errors[:3]))
            browser.close()
    finally:
        if httpd: httpd.shutdown()
    failed = [c for c in CHECKS if not c[1]]
    print(f"\n{'GATE 1 GRÜN' if not failed else 'GATE 1 ROT'} — {len(CHECKS)-len(failed)}/{len(CHECKS)} Checks")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
