#!/usr/bin/env python3
"""Fresh screenshots from the live URL for the making-of PDF."""
from playwright.sync_api import sync_playwright

URL = "https://angebots-blitz.demo.osai.solutions/?fast=1"
OUT = "/Users/Osman/Desktop/APPS/angebots-blitz/making-of/shots"
FORCE_REVEAL = ".reveal{opacity:1!important;transform:none!important} html{scroll-behavior:auto!important}"


def settle(pg, ms=600):
    pg.wait_for_timeout(ms)


def run_show(pg, tile_testid, brutto):
    pg.locator(f'[data-testid="{tile_testid}"]').click()
    pg.wait_for_function(
        "sel => document.querySelector(sel).textContent.includes('%s')" % brutto,
        arg="#sum-brutto", timeout=30000)
    pg.wait_for_timeout(1500)  # badge + letzte Pop-ins


with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Desktop 1440 ----------
    ctx = b.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.add_style_tag(content=FORCE_REVEAL)
    # Count-ups triggern: einmal durchscrollen
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    settle(pg, 900)
    pg.evaluate("window.scrollTo(0, 0)")
    settle(pg, 1200)

    # 1) Hero + Kacheln
    box = pg.locator("#kacheln").bounding_box()
    sy0 = pg.evaluate("window.scrollY")
    pg.screenshot(path=f"{OUT}/hero.png", full_page=True,
                  clip={"x": 0, "y": 0, "width": 1440,
                        "height": min(box["y"] + sy0 + box["height"] + 24, 2400)})

    # Topbar stoert Element-Shots des Dokuments (sticky) -> ausblenden
    pg.add_style_tag(content=".topbar{display:none!important}")

    # 2) Fertiges SHK-Dokument
    run_show(pg, "tile-shk", "1.236,41")
    pg.locator("#doc").scroll_into_view_if_needed()
    settle(pg)
    pg.locator("#doc").screenshot(path=f"{OUT}/doc-shk.png")

    # 3) Brand-Wechsler mit "Dein Betrieb"
    pg.on("dialog", lambda d: d.accept("Müller Haustechnik"))
    pg.locator('[data-testid="brand-custom"]').click()
    settle(pg, 900)
    tb = pg.locator("#doc-toolbar").bounding_box()
    dh = pg.locator(".doc-head").bounding_box()
    sy = pg.evaluate("window.scrollY")
    pg.screenshot(path=f"{OUT}/brand-custom.png", full_page=True,
                  clip={"x": tb["x"] - 12, "y": tb["y"] + sy + 16,
                        "width": tb["width"] + 24,
                        "height": (dh["y"] + dh["height"]) - tb["y"] + 44})

    # 4) "So kalkuliert die KI"-Aufklapper
    calc = pg.locator("#calc-details")
    calc.evaluate("el => el.open = true")
    calc.scroll_into_view_if_needed()
    settle(pg, 700)
    calc.screenshot(path=f"{OUT}/kalk.png")

    ctx.close()

    # ---------- Mobile 390 ----------
    ctx2 = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3)
    pg2 = ctx2.new_page()
    pg2.goto(URL, wait_until="networkidle")
    pg2.add_style_tag(content=FORCE_REVEAL + " .topbar{display:none!important}")
    pg2.locator('[data-testid="tile-shk"]').scroll_into_view_if_needed()
    settle(pg2, 400)
    run_show(pg2, "tile-shk", "1.236,41")
    pg2.locator("#doc").scroll_into_view_if_needed()
    settle(pg2, 500)
    pg2.locator("#doc").screenshot(path=f"{OUT}/mobile-390.png")
    ctx2.close()

    b.close()
print("shots done")
