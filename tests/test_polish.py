#!/usr/bin/env python3
"""Gate 3 — Polish: 390px ohne Overflow, OG-Tags, Asset-Gewicht, A11y-Basics.
Voraussetzung: Server auf AB_BASE (Default dev-server :8742)."""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("AB_BASE", "http://127.0.0.1:8742")

CHECKS = []
def check(name, cond, detail=""):
    CHECKS.append((name, bool(cond), detail))
    print(("  ✓ " if cond else "  ✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- 390px: kein horizontaler Overflow, vor und nach der Show
        m = b.new_page(viewport={"width": 390, "height": 844})
        errors = []
        m.on("pageerror", lambda e: errors.append(str(e)))
        m.goto(BASE + "/?fast=1", wait_until="networkidle")
        w0 = m.evaluate("document.documentElement.scrollWidth")
        check("390px initial: kein Overflow", w0 <= 390, str(w0))
        for sid in ("shk", "elektro", "maler"):
            m.click(f"[data-testid=tile-{sid}]")
            m.wait_for_selector("[data-testid=done-badge]", timeout=30000)
            w = m.evaluate("document.documentElement.scrollWidth")
            check(f"390px nach {sid}: kein Overflow", w <= 390, str(w))
        cols = m.evaluate("getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length")
        check("390px: Kacheln gestapelt (1 Spalte)", cols == 1, str(cols))
        check("390px: Record-Button sichtbar", m.locator("#rec-btn").is_visible())
        check("390px: keine JS-Errors", not errors, "; ".join(errors[:3]))

        # --- OG-/Meta-Tags
        d = b.new_page(viewport={"width": 1280, "height": 900})
        d.goto(BASE + "/?fast=1", wait_until="networkidle")
        for prop in ("og:title", "og:description", "og:image", "og:url", "og:locale"):
            check(f"Meta {prop}", d.locator(f'meta[property="{prop}"]').count() == 1)
        check("Meta twitter:card", d.locator('meta[name="twitter:card"]').count() == 1)
        check("Meta description", d.locator('meta[name="description"]').count() == 1)
        check("lang=de", d.evaluate("document.documentElement.lang") == "de")
        check("Favicon", d.locator('link[rel="icon"]').count() == 1)

        # --- og.png existiert und ist 1200x630
        og = os.path.join(ROOT, "assets/img/og.png")
        check("og.png existiert", os.path.exists(og))
        if os.path.exists(og):
            import struct
            with open(og, "rb") as f:
                f.seek(16); w, h = struct.unpack(">II", f.read(8))
            check("og.png 1200×630", (w, h) == (1200, 630), f"{w}x{h}")

        # --- Ladegewicht: HTML+CSS+JS schlank (Audio lädt nur on-demand)
        size = sum(os.path.getsize(os.path.join(ROOT, f)) for f in
                   ("index.html", "assets/css/style.css", "assets/js/app.js", "assets/js/scenarios.js"))
        check("Kern-Assets < 100 KB", size < 100 * 1024, f"{size/1024:.0f} KB")

        # --- A11y-Basics
        check("Buttons haben Text/Label", d.evaluate(
            "[...document.querySelectorAll('button')].every(b => (b.textContent||'').trim().length > 0)"))
        check("Bilder haben alt", d.evaluate(
            "[...document.querySelectorAll('img')].every(i => i.hasAttribute('alt'))"))

        # --- Impressum + Datenschutz (§5 DDG / DSGVO)
        check("Footer verlinkt Impressum + Datenschutz",
              d.locator('.footer a[href="impressum.html"]').count() == 1 and
              d.locator('.footer a[href="datenschutz.html"]').count() == 1)
        d.goto(BASE + "/impressum.html", wait_until="networkidle")
        imp = d.text_content("main")
        check("Impressum: § 5 DDG + Anbieter", "§ 5 DDG" in imp and "Öztopcu" in imp and "Fellbach" in imp)
        check("Impressum: USt-IdNr", "DE462559965" in imp)
        d.goto(BASE + "/datenschutz.html", wait_until="networkidle")
        ds = d.text_content("main")
        check("Datenschutz: Mikrofon-Verarbeitung erklärt", "Mikrofon" in ds and "Angebots" in ds)
        check("Datenschutz: keine Speicherung + Gemini als Auftragsverarbeiter",
              "Keine Speicherung" in ds and "Gemini" in ds and "Auftragsverarbeit" in ds)
        b.close()

    failed = [c for c in CHECKS if not c[1]]
    print(f"\n{'GATE 3 GRÜN' if not failed else 'GATE 3 ROT'} — {len(CHECKS)-len(failed)}/{len(CHECKS)} Checks")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
