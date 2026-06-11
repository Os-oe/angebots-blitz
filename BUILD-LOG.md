# BUILD-LOG — Angebots-Blitz

one-prompt-kit · Station ② op-build · autonom · 2026-06-11
Vertrag: `agent-studio/.planning/one-prompt/angebots-blitz/CONCEPT.md`

## Phasen & Gates

| Phase | Gate | Ergebnis |
|---|---|---|
| 1 MVP-Kern | Playwright: 3 Szenarien e2e, Summen centgenau (§3), Fachsprache | **GRÜN 42/42**, 2× gelaufen, 0 Flakes |
| 2 Features | API-Schema mit Fixture, Origin-403, Cap-429 graceful, PDF, Brand-Wechsler | **GRÜN 27/27**, 2× gelaufen, inkl. 2 echte Gemini-Calls |
| 3 Polish | 390px ohne Overflow, OG-Tags, Gewicht, A11y | **GRÜN 21/21**, 2× gelaufen |
| 4 Ship | E2E live 2× inkl. echtem /api/quote | — |
| 5 Excellence | 10 Schwächen → Top-5-Fix → Suite 2× | — |

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

## Kosten bis Ende Phase 3

| Posten | Ist |
|---|---|
| TTS 3 Clips (6 budget-guard-Records à 0,05 €, inkl. 3 Kie-Retries) | 0,30 € |
| Gemini Flash (4 Calls: 1 Smoke + 2× Gate-2-Suite + Modell-Listing) | 0,00 € (Free-Tier-Quota) |
| Bilder | 0,00 € (kein AI-Bild — Logo kopiert, OG = Screenshot) |
| **Summe** | **0,30 €** |
