# BUILD-LOG — Angebots-Blitz

one-prompt-kit · Station ② op-build · autonom · 2026-06-11
Vertrag: `agent-studio/.planning/one-prompt/angebots-blitz/CONCEPT.md`

## Phasen & Gates

| Phase | Gate | Ergebnis |
|---|---|---|
| 1 MVP-Kern | Playwright: 3 Szenarien e2e, Summen centgenau (§3), Fachsprache | **GRÜN 42/42**, 2× gelaufen, 0 Flakes |
| 2 Features | API-Schema mit Fixture, Origin-403, Cap-429 graceful, PDF, Brand-Wechsler | **GRÜN 27/27**, 2× gelaufen, inkl. 2 echte Gemini-Calls |
| 3 Polish | 390px ohne Overflow, OG-Tags, Gewicht, A11y | **GRÜN 21/21**, 2× gelaufen |
| 4 Ship | E2E live 2× inkl. echtem /api/quote | **GRÜN** — alle 3 Suiten 2× gegen https://angebots-blitz.demo.osai.solutions, inkl. 2 echte Gemini-Calls über die Live-API |
| 5 Excellence | 10 Schwächen → Top-5-Fix → Suite 2× | **GRÜN** — s. u. |

## Excellence-Pass: 10 Schwächen, ehrlich

1. **Kein Skip** — ein Meister in Eile musste die 30-s-Show aushalten → **FIX:** „Direkt zum Ergebnis »"-Button (beschleunigt die laufende Show auf 2 %, Summen bleiben exakt; getestet: < 8 s statt ~25 s).
2. **Kein Szenario-Wechsel im Stage-Bereich** — für Nr. 2/3 musste man hochscrollen → **FIX:** Stage-Tabs (SHK/Elektro/Maler) direkt über dem Dokument.
3. **Mobil lief die Show unterhalb des Viewports** — Transkript oben, Positionen poppten unsichtbar → **FIX:** Auto-Scroll zum Dokument, sobald die Positionen aufbauen.
4. **„Mit Ihrem Logo" war nur behauptet** — Brand-Wechsler hatte nur 3 fiktive Presets → **FIX:** „+ Dein Betrieb?"-Chip: eigener Firmenname → Monogramm + Farbe live im Briefkopf (der Conversion-Moment).
5. **Gemini-Key stand als URL-Query-Param** in jedem Request → **FIX:** `x-goog-api-key`-Header, Key taucht in keinem URL-Log mehr auf.
6. **Live-Pfad ohne Beispiel, was man sagen soll** → **FIX (Bonus):** Beispiel-Satz unter dem Record-Button.
7. Ganze Sektionen als ein Reveal-Block — bei sehr schnellem Scroll kurz leere Fläche. **Akzeptiert** (Animations-Ästhetik, 0,7 s).
8. In-Memory-Tages-Cap reset bei Cold Start. **Akzeptiert + dokumentiert** (CONCEPT §4 erlaubt den Kompromiss; Gemini-Quota als zweite Leine).
9. TTS-Kachel-Stimme klingt aufgeräumter als ein echter Monteur. **Akzeptiert** (fürs Promo-Video sogar besser verständlich).
10. `prefers-reduced-motion` deckt Reveals ab, aber nicht Typewriter/Count-ups. **Akzeptiert** für die Demo — die Show IST das Produkt; Skip-Button (Fix 1) ist der Ausweg.

## Entscheidungen (autonom, Begründung)

- **Modell `gemini-3.5-flash`** (Fallback `gemini-2.5-flash`): per ListModels mit dem
  echten Key verifiziert; ein Call liefert Transkript + Angebots-JSON via
  `responseSchema`. webm/opus-Audio als `inlineData` (camelCase!) funktioniert.
- **Tages-Cap als In-Memory-Zähler** (40/Tag global, 5/Tag pro IP, pro Function-Instanz):
  Vercel Blob hätte einen eigenen Store + Token gebraucht — für eine Demo
  überdimensioniert. Dokumentierter Kompromiss laut CONCEPT §4; zweite Leine ist
  das Quota des Gemini-Keys. Bei Cap/Fehler: graceful Fallback auf die
  Stage-Szenarien + „Live-Demo im Erstgespräch“-CTA (getestet).
- **Kachel-Audio: TTS ja** — budget-guard check audio 0.30 war ok. 3 Clips
  (ElevenLabs Multilingual v2 via Kie, Voice `EkK5I93UQWFDigLMpZcX`, männlich,
  deutsch). 2 transiente Kie-Fails, Retries erfolgreich. Audio lädt nur on-Click
  (kein Page-Weight), Fehler beim Laden → stiller Transkript-Ticker.
- **PDF via print-CSS** (`window.print()` + `@media print` zeigt nur das Dokument
  als A4): kein JS-PDF-Lib-Ballast, echter Druck-/PDF-Dialog des Systems.
- **OG-Image als Hero-Screenshot** (Playwright, 1200×630): 0 €, kein AI-Bild nötig.

## „Würde ein Meister das ernst nehmen?“ — Urteil (Phase 3)

**Ja, mit Stolz aufs Detail.** Begründung gegen die harten Kriterien:

- Das Dokument hat alles, was ein echtes Angebot hat: Briefkopf mit USt-IdNr.,
  Angebots-Nr., Datum, **Bindefrist 4 Wochen** (mit ausgerechnetem Datum),
  Empfängeradresse mit Absenderzeile, Positionstabelle **Pos/Beschreibung/Menge/
  Einheit/EP/GP**, Material/Lohn/Pauschale pro Position ausgewiesen + Subtotale,
  Netto → 19 % USt → Brutto, **Zahlungsziel 14 Tage**, **Gewährleistung BGB**,
  Unterschriftszeile.
- Die Positionen sprechen Fachsprache: „Demontage Altbestand, Montage komplett
  inkl. Anschluss und Dichtheitsprüfung“, „E-Check: Messung und Prüfprotokoll
  nach DIN VDE 0100-600“, „Oberflächengüte Q2“, „NYM-J 3x1,5 mm²“ — kein
  „Wasserhahn tauschen“.
- Die Preise stimmen mit der Marktrecherche überein (72 €/h SHK, 68 €/h Elektro,
  m²-Sätze Maler) und sind im Aufklapper transparent erklärt (Stundenverrechnungssatz,
  15 % Materialaufschlag, Quellen).
- Ehrliche Restkritik: Der „DEMO“-Stempel und die fiktive Handwerksrolle-Zeile
  outen es bewusst als Demo (gewollt, Seriosität); die Sprachnotiz-Stimme ist
  TTS und klingt ordentlicher als ein echter Monteur nach Feierabend — für die
  Show akzeptabel, fürs Video ein Pluspunkt (verständlich).

## Iteration 2 (externer Review) — 2026-06-11

Externer Review (Screenshots `/tmp/ab-review/`) ergab 14 Findings. Alle 14 umgesetzt,
je Finding ein atomarer Commit. Entscheidungen:

| # | Finding | Entscheidung |
|---|---|---|
| 1 | /api/quote halluzinierte bei Müll-Audio (2-Byte-Fake → erfundener Kunde) | Serverseitig Min-Größe **10 KB** + Min-Dauer **2 s** (→ 422 + fallback, ehrliche Meldung). Gemini-Prompt: bei unverständlichem/leerem Audio `{"error":"unverstaendlich"}`, NIE Kunden erfinden; Schema um `error`-Feld erweitert, `validQuote()` blockt `error`-Antworten → Frontend zeigt Meldung + Stage-Fallback. |
| 2 | Impressum/Datenschutz fehlten (§5 DDG/DSGVO) | `impressum.html` + `datenschutz.html` mit **echten OsAI-Stammdaten** (aus `business/STAMMDATEN.md` + live osai.solutions/de/impressum: Osman Öztopcu, Karolingerstr. 55, 70736 Fellbach, team@osai.solutions, USt-IdNr DE462559965). Datenschutz erklärt Mikrofon-Verarbeitung: nur zur Angebotserstellung, keine Speicherung, Google Gemini als Auftragsverarbeiter, Art. 6 (1) a; dazu Vercel-Hosting, Google Fonts, keine Cookies. Footer-Links auf allen Seiten. |
| 3 | „Material +15 %"-Schritt beim Maler ohne Material-Position | `steps[]` filtert jetzt pro Szenario (`hasMaterial`) — gilt auch für Live-Quotes. |
| 4 | Maler-Wandfläche 58 m² unplausibel für 25-m²-Zimmer | 46 m² (Umfang 20 m × 2,6 m abzüglich Tür/Fenster). Neue fixierte Summen: Netto **921,30** / USt **175,05** / Brutto **1.096,35** — centgenau, alle Assertions nachgezogen. |
| 5 | SHK Pos. 1+2 doppelten die Montage (steckt in Pos. 4) | Beide auf „— liefern" gekürzt. |
| 6 | „E-Check nach DIN VDE 0100-600" fachlich schief | → „Erstprüfung mit Messprotokoll nach DIN VDE 0100-600". |
| 7 | Custom-Brand-Mail mit Umlauten → kaputte Domain | Transliteration ä→ae ö→oe ü→ue ß→ss vor dem Domain-Bau (Test: „Müller & Söhne Straßenbau" → info@mueller-soehne-strassenbau.de). |
| 8 | .pos-typ-Chips landeten auf dem gedruckten Angebot | `@media print { .pos-typ { display:none } }`. |
| 9 | „PDF herunterladen" log (es öffnet den Druckdialog) | → „Als PDF speichern". |
| 10 | Mobile < 480px: Einheit-Spalte verschwand kommentarlos | Einheit wandert in die Mengen-Zelle („8 Std.") via `.unit-inline`-Span (nur < 480px sichtbar). |
| 11 | „echte Aufträge/Original-Sprachnotizen" vs. Footer „alles fiktiv" | → „typische Aufträge" / „nachgestellte Sprachnotizen", Hero-„echte Beispiel-Notiz" ebenfalls entschärft. |
| 12 | Kachel-Audio ohne Zustands-Feedback | Play-Icon wird Pause + pulsiert während der Wiedergabe; erneuter Klick auf dieselbe Kachel stoppt den Clip (Show läuft weiter); `ended`/`error` setzen zurück. |
| 13 | Elektro-KI-Schritt „Stundenverrechnungssatz 68 €/h" passte nicht zu Stück-Positionen | Per-Szenario-Override `kalkStep`: „Einheitspreise je Auslass kalkuliert". |
| 14 | Hero-Quellen „Bitkom 2025" / „ZDH 2026" | Websearch: 76 % stammt aus der **ZDH-Sonderumfrage** (Q1 2023, 10.630 Betriebe, „ständige Anpassung an neue Vorschriften" = größter Belastungsfaktor) — nicht Bitkom. „62 % lehnen Aufträge ab (ZDH 2026)" nicht belegbar → ersetzt durch belegte **74 %** („Aufwand in 5 Jahren gestiegen", gleiche Umfrage). og:description auf „Branchenumfragen zufolge" entschärft. |

**Gates Iteration 2:** lokal alle 3 Suiten 2× GRÜN (46+39+27, inkl. neuer Checks
Müll-Audio→422, Umlaut-Mail, Maler-Summen neu, KI-Schritt-Konsistenz, Legal-Seiten,
Mobile-Einheit, Kachel-Audio-State) → Push → Live-E2E gegen
https://angebots-blitz.demo.osai.solutions ebenfalls 2× GRÜN (inkl. 2 echte
Gemini-Calls). Fix-Screenshots: `/tmp/ab-fix2/` (maler-doc, footer,
custom-brand-briefkopf, mobile-tabelle, hero-quellen).

## Kosten bis Ende Phase 3

| Posten | Ist |
|---|---|
| TTS 3 Clips (6 budget-guard-Records à 0,05 €, inkl. 3 Kie-Retries) | 0,30 € |
| Gemini Flash (4 Calls: 1 Smoke + 2× Gate-2-Suite + Modell-Listing) | 0,00 € (Free-Tier-Quota) |
| Bilder | 0,00 € (kein AI-Bild — Logo kopiert, OG = Screenshot) |
| **Summe** | **0,30 €** |
