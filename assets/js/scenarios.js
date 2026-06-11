/* Angebots-Blitz — die 3 gestagten Szenarien.
 * Zahlen 1:1 aus CONCEPT §3 (Fachlichkeits-Recherche), statisch vorgerechnet.
 * Summen sind auf den Cent fixiert und werden im Test gegen die Anzeige geprüft. */
window.SCENARIOS = {
  shk: {
    id: "shk",
    label: "SHK · Bad",
    icon: "wrench",
    title: "Waschtisch-Austausch im Bad",
    gewerk: "Sanitär · Heizung · Klima",
    firma: "muster",
    angebotsNr: "AB-2026-1042",
    kunde: "Fam. Kessler, Gartenstraße 12, 71334 Waiblingen",
    stundensatz: 72,
    transcript:
      "Ähm, ja — Auftrag Kessler, Gartenstraße. Die wollen im Bad den alten Waschtisch raus und einen neuen 60er mit Halbsäule rein, dazu einen neuen Einhebelmischer. Eckventile sahen auch nicht mehr gut aus, machen wir gleich mit. Ich rechne mit zwei Mann, zusammen so acht Stunden inklusive Demontage. Entsorgung vom alten Zeug übernehmen wir. Schreib das mal als Angebot fertig.",
    positionen: [
      { pos: 1, beschreibung: "Waschtisch 60 cm, Sanitärkeramik weiß, inkl. Halbsäule und Befestigungsmaterial — liefern", menge: 1, einheit: "Stk.", ep: 215.0, typ: "material" },
      { pos: 2, beschreibung: "Einhebelmischer Waschtisch, Markenfabrikat verchromt, mit Ablaufgarnitur — liefern", menge: 1, einheit: "Stk.", ep: 135.0, typ: "material" },
      { pos: 3, beschreibung: "Eckventile erneuern, Design-Siphon und Kleinmaterial (Dichtungen, Anschlussschläuche)", menge: 1, einheit: "psch.", ep: 48.0, typ: "material" },
      { pos: 4, beschreibung: "Demontage Altbestand, Montage komplett inkl. Anschluss und Dichtheitsprüfung — 2 Monteure, Monteurstunden", menge: 8, einheit: "Std.", ep: 72.0, typ: "lohn" },
      { pos: 5, beschreibung: "An- und Abfahrt inkl. fachgerechter Entsorgung Altmaterial", menge: 1, einheit: "psch.", ep: 65.0, typ: "pauschale" }
    ],
    netto: 1039.0,
    ust: 197.41,
    brutto: 1236.41
  },
  elektro: {
    id: "elektro",
    label: "Elektro · Wohnzimmer",
    icon: "bolt",
    title: "Steckdosen nachrüsten + LED-Auslässe",
    gewerk: "Elektroinstallation",
    firma: "blank",
    angebotsNr: "AB-2026-1043",
    kunde: "Hr. Demir, Lindenweg 4, 70372 Stuttgart",
    stundensatz: 68,
    transcript:
      "Kurze Notiz zum Auftrag Demir, Lindenweg: Im Wohnzimmer sollen vier Steckdosen unter Putz nachgerüstet werden, einmal die Wand hoch. Dazu zwei Deckenauslässe für LED-Einbauleuchten setzen. Material haben wir auf Lager, das rechne ich pauschal. Am Ende E-Check mit Messprotokoll, ist Pflicht. Anfahrt ganz normal. Mach mir das Angebot fertig.",
    positionen: [
      { pos: 1, beschreibung: "Steckdose UP nachrüsten inkl. Stemm- und Schlitzarbeiten, Leitungsverlegung und Anschluss, Schalterprogramm Standard weiß", menge: 4, einheit: "Stk.", ep: 142.0, typ: "lohn" },
      { pos: 2, beschreibung: "Deckenauslass für LED-Einbauleuchte setzen, inkl. Anschluss und Funktionsprüfung", menge: 2, einheit: "Stk.", ep: 118.0, typ: "lohn" },
      { pos: 3, beschreibung: "Installationsmaterial: Mantelleitung NYM-J 3x1,5 mm², UP-Dosen, Klemmen, Befestigungsmaterial", menge: 1, einheit: "psch.", ep: 96.0, typ: "material" },
      { pos: 4, beschreibung: "E-Check: Messung und Prüfprotokoll nach DIN VDE 0100-600", menge: 1, einheit: "psch.", ep: 75.0, typ: "lohn" },
      { pos: 5, beschreibung: "An- und Abfahrt", menge: 1, einheit: "psch.", ep: 39.0, typ: "pauschale" }
    ],
    netto: 1014.0,
    ust: 192.66,
    brutto: 1206.66
  },
  maler: {
    id: "maler",
    label: "Maler · 25 m²",
    icon: "roller",
    title: "Wohnzimmer 25 m² streichen",
    gewerk: "Maler- und Lackiererarbeiten",
    firma: "roth",
    angebotsNr: "AB-2026-1044",
    kunde: "Fr. Brandt, Ahornstraße 8, 71384 Weinstadt",
    stundensatz: null,
    transcript:
      "So, Angebot für Frau Brandt: Wohnzimmer, fünf mal fünf, also 25 Quadratmeter Grundfläche. Wände und Decke zweimal weiß streichen, vorher ein paar Stellen spachteln und schleifen, schätze so zwölf Quadratmeter. Alles ordentlich abdecken, die hat neuen Parkett. Anfahrt wie immer. Kannst du fertig machen.",
    positionen: [
      { pos: 1, beschreibung: "Abdeck- und Schutzmaßnahmen: Boden, Fenster und Türen mit Folie und Malervlies abdecken und abkleben", menge: 1, einheit: "psch.", ep: 85.0, typ: "lohn" },
      { pos: 2, beschreibung: "Schadhafte Stellen spachteln und schleifen, Oberflächengüte Q2", menge: 12, einheit: "m²", ep: 6.5, typ: "lohn" },
      { pos: 3, beschreibung: "Wandflächen zweimal streichen, Dispersionsfarbe weiß matt, deckend, inkl. Material", menge: 46, einheit: "m²", ep: 9.8, typ: "lohn" },
      { pos: 4, beschreibung: "Deckenfläche zweimal streichen inkl. sauberem Schneiden der Anschlüsse, Dispersionsfarbe weiß", menge: 25, einheit: "m²", ep: 10.5, typ: "lohn" },
      { pos: 5, beschreibung: "An- und Abfahrt inkl. Materialtransport", menge: 1, einheit: "psch.", ep: 45.0, typ: "pauschale" }
    ],
    netto: 921.3,
    ust: 175.05,
    brutto: 1096.35
  }
};

/* Brand-Presets für den Brand-Wechsler (alle fiktiv) */
window.BRANDS = {
  muster: {
    id: "muster", name: "Muster Haustechnik GmbH", mono: "MH", color: "#1f6feb",
    tagline: "Sanitär · Heizung · Klima", strasse: "Werkstattring 14", ort: "71332 Waiblingen",
    tel: "07151 / 98 76 54", mail: "info@muster-haustechnik.de", ust: "DE 123 456 789"
  },
  blank: {
    id: "blank", name: "Elektro Blank GmbH", mono: "EB", color: "#e8a200",
    tagline: "Elektroinstallation · Smart Home", strasse: "Industriestraße 7", ort: "70372 Stuttgart",
    tel: "0711 / 22 33 44", mail: "service@elektro-blank.de", ust: "DE 987 654 321"
  },
  roth: {
    id: "roth", name: "Malermeister Roth", mono: "MR", color: "#c2403a",
    tagline: "Maler- und Lackiererarbeiten", strasse: "Farbgasse 3", ort: "71384 Weinstadt",
    tel: "07151 / 55 66 77", mail: "kontakt@maler-roth.de", ust: "DE 456 789 123"
  }
};
