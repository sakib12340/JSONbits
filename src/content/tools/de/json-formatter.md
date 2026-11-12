---
locale: de
toolId: json-formatter
title: JSON Formatter
description: "JSON im Browser formatieren und einrücken – 2 oder 4 Leerzeichen, Tabs, präzise Zeilen- und Spaltenfehler, große Zahlen bleiben erhalten, ohne Upload."
summary: "Kompaktes oder unordentliches JSON in ein gleichmäßig eingerücktes Dokument verwandeln, ohne einen einzigen Wert zu verändern."
steps:
  - "Füge JSON in den Eingabebereich ein, ziehe eine .json-Datei an eine beliebige Stelle der Seite oder klicke auf Datei öffnen. Beispiel lädt ein Dokument mit verschachtelten Objekten, Arrays und einer 64-Bit-Ganzzahl."
  - "Wähle die Einrückung in der Werkzeugleiste. Zwei Leerzeichen sind voreingestellt; vier Leerzeichen oder Tabs passen zu den meisten Editoren und Konfigurationsdateien."
  - "Klicke auf Formatieren oder drücke Ctrl/Cmd+Enter und kopiere dann das Ergebnis oder lade es als formatted.json herunter."
example:
  caption: "Kompakte Eingabe links, formatierte Ausgabe rechts."
  input: '{"project":"JSON Bits","private":true,"downloads":9007199254740993,"tags":["json","formatter"]}'
  output: |
    {
      "project": "JSON Bits",
      "private": true,
      "downloads": 9007199254740993,
      "tags": ["json", "formatter"]
    }
mistakes:
  - "Ein nachgestelltes Komma nach der letzten Eigenschaft oder dem letzten Array-Element ist in JSON ungültig. Entferne das Komma oder lasse das Dokument von JSON Repair reparieren."
  - "Aus JavaScript kopierte Kommentare (// oder /* */) gehören nicht zur JSON-Grammatik und müssen entfernt werden."
  - "Schlüssel ohne Anführungszeichen und einfache Anführungszeichen sind gültiges JavaScript, aber kein gültiges JSON. Setze Schlüssel und Zeichenketten in doppelte Anführungszeichen."
  - "Typografische Anführungszeichen aus einem Textverarbeitungsprogramm sehen wie doppelte Anführungszeichen aus, sind aber andere Zeichen. Ersetze sie durch gerade Anführungszeichen."
faq:
  - q: "Wird mein JSON irgendwohin hochgeladen?"
    a: "Nein. Die Formatierung läuft in einem Web Worker in diesem Browser-Tab. Die Seite stellt während der Arbeit keine Netzwerkanfrage, und es gibt keinen Server, der das Dokument empfangen könnte."
  - q: "Verändert die Formatierung große Zahlen?"
    a: "Nein. Der Formatierer kopiert Zahlentoken exakt, statt sie zu parsen und neu zu serialisieren. 9007199254740993 behält alle sechzehn Ziffern, und lange Dezimalzahlen behalten jede Nachkommastelle."
  - q: "Wie große Dateien kann ich formatieren?"
    a: "Dateien bis 100 MB werden akzeptiert. Eingaben unter 1 MB aktualisieren sich beim Tippen; größere Dokumente laufen auf Anforderung mit Fortschrittsanzeige, damit die Seite nie einfriert."
  - q: "Warum meldet scheinbar gültiges JSON einen Fehler?"
    a: "Meist sind ein nachgestelltes Komma, ein Kommentar oder einfache Anführungszeichen die Ursache. Die Fehleranzeige nennt Zeile und Spalte, zeigt einen Ausschnitt und schlägt die Korrektur in verständlichen Worten vor."
  - q: "Kann ich eine JSON-Datei formatieren, ohne sie in einem Texteditor zu öffnen?"
    a: "Ja. Ziehe die Datei auf die Seite oder klicke auf Datei öffnen. Der Formatierer liest sie lokal, zeigt Dateiname und Größe an und bietet das formatierte Ergebnis zum Download an."
---

Der JSON Formatter verwandelt kompaktes oder ungleichmäßig formatiertes JSON in ein Dokument, das sich leicht lesen, prüfen und vergleichen lässt. Er parst mit einem Tokenizer statt mit `JSON.parse`, daher werden Zahlentoken exakt so kopiert, wie sie geschrieben wurden. Eine 64-Bit-Ganzzahl wie `9007199254740993` behält alle ihre Ziffern, statt stillschweigend zu `9007199254740992` zu werden, und hochpräzise Dezimalzahlen behalten jede Stelle. Es ändert sich ausschließlich der Leerraum.

Alles läuft in einem Web Worker in diesem Browser-Tab. Text, den du einfügst, ablegst oder öffnest, wird nirgendwohin gesendet: Es gibt keinen Upload-Endpunkt, kein Konto und keine Analysen, die den Inhalt lesen. Große Dokumente laufen durch denselben Worker, sodass eine mehrere Megabyte große Datei einen Fortschrittsstatus erzeugt, statt die Seite einzufrieren.

Ist das Dokument ungültig, stoppt der Formatierer beim ersten Problem und meldet Zeile, Spalte, einen kurzen Ausschnitt und einen verständlichen Hinweis. Korrigiere die Eingabe und starte erneut. Die Einrückungseinstellung wird nur in diesem Browser gespeichert; das JSON selbst wird nie persistiert.
