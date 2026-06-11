#!/usr/bin/env python3
"""Render making-of: per-page QA PNGs + final A4 PDF via Playwright."""
import pathlib
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
PDF_OUT = pathlib.Path.home() / "Desktop/edits/angebots-blitz-Making-of.pdf"
PDF_OUT.parent.mkdir(parents=True, exist_ok=True)
(HERE / "qa").mkdir(exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1240, "height": 1754}, device_scale_factor=2)
    pg.goto(f"file://{HERE}/index.html", wait_until="networkidle")
    pg.wait_for_timeout(1200)  # fonts + images settled

    pages = pg.locator(".page")
    n = pages.count()
    for i in range(n):
        el = pages.nth(i)
        el.scroll_into_view_if_needed()
        pg.wait_for_timeout(150)
        el.screenshot(path=str(HERE / "qa" / f"page-{i+1}.png"))

    pg.pdf(path=str(PDF_OUT), format="A4", print_background=True,
           margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
    b.close()

print(f"QA: {n} pages -> qa/ · PDF -> {PDF_OUT}")
