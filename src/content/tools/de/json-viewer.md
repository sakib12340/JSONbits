---
locale: de
toolId: json-viewer
title: JSON Viewer
description: "Großes JSON als virtualisierten Baum erkunden: Schlüssel und Werte suchen, JSONPath-Pfade kopieren, nur aufklappen, was du brauchst. Alles ohne Upload."
summary: "Lies ein großes JSON-Dokument als Baum mit verzögertem Aufklappen, Suche und kopierbaren Pfaden statt als Textwand."
steps:
  - "Füge JSON ein oder ziehe eine Datei hinein und klicke dann auf Baum anzeigen oder drücke Ctrl/Cmd+Enter. Das Beispiel lädt ein verschachteltes Dokument mit Arrays, Objekten und gemischten Werten."
  - "Klappe Zeilen mit den Pfeiltasten oder per Klick auf. Bis Ebene aufklappen öffnet mehrere Ebenen auf einmal; Alle einklappen führt zurück zur Wurzel."
  - "Nutze die Suche, um Schlüssel oder Werte zu finden, und kopiere dann einen JSONPath-Pfad oder den Wert der ausgewählten Zeile."
example:
  caption: "Eine Zeile pro Knoten, mit Typabzeichen, Anzahl der Kinder und dem JSONPath der Auswahl."
  input: |
    {
      "team": [
        { "name": "Ada", "role": "engineer" },
        { "name": "Grace", "role": "admiral" }
      ]
    }
  output: |
    team                 array (2)
      0                  object (2)
        name             "Ada"
        role             "engineer"
      1                  object (2)
mistakes:
  - "JSON mit einem nachgestellten Komma einzufügen verhindert den Aufbau des Baums; die Fehlermeldung zeigt auf die genaue Zeile."
  - "Zu erwarten, dass jeder Knoten sofort gerendert wird. Große Dokumente klappen verzögert auf, eingeklappte Zweige sind also nicht im DOM."
  - "Einen Wert zu kopieren, der noch eingeklappt ist. Klappe den Knoten zuerst auf oder kopiere den Pfad und prüfe ihn an anderer Stelle."
faq:
  - q: "Wie große Dokumente kann der Viewer öffnen?"
    a: "Dateien bis 100 MB werden akzeptiert. Der Baum ist virtualisiert und wird in Scheiben aus dem Worker geladen, sodass jederzeit nur die sichtbaren Zeilen in der Seite existieren."
  - q: "Friert der Viewer bei großen Dateien ein?"
    a: "Nein. Parsen und Indexieren laufen in einem Web Worker, und das Ergebnis wird als virtualisierte Liste gerendert, sodass das Scrollen flüssig bleibt, statt den Hauptthread zu blockieren."
  - q: "Welches Format haben kopierte Pfade?"
    a: "Pfade sind JSONPath-Ausdrücke wie $.team[0].name, bereit zum Einfügen in ein Abfragewerkzeug, einen Test oder eine Dokumentation."
  - q: "Kann ich auch Werte durchsuchen, nicht nur Schlüssel?"
    a: "Ja. Die Suche findet Schlüssel und skalare Werte, meldet die Anzahl der Treffer und lässt dich zwischen ihnen springen."
  - q: "Lädt der Viewer mein JSON hoch oder speichert er es?"
    a: "Nein. Das Dokument wird in deinem Browser geparst und beim Schließen des Tabs verworfen. Nichts wird an einen Server gesendet und nichts im Speicher abgelegt."
---

Der JSON Viewer zeigt ein Dokument als Baum aus Zeilen statt als Textblock. Jede Zeile zeigt einen Schlüssel, seinen Typ und eine Vorschau des Werts, bei Objekten und Arrays mit Anzahl. Zweige öffnen sich auf Anforderung, sodass ein Dokument mit Zehntausenden Knoten sofort erscheint und beim Scrollen flüssig bleibt.

Der Baum wird in einem Web Worker aufgebaut und der Seite in Scheiben geliefert. Diese Architektur hält den Hauptthread frei: Die Seite enthält nur die gerade sichtbaren Zeilen, nicht das ganze Dokument. Die Suche läuft im selben Worker, findet sowohl Schlüssel als auch skalare Werte und liefert eine Trefferzahl sowie eine Möglichkeit, durch die Ergebnisse zu springen.

Pfade werden als JSONPath angezeigt, zum Beispiel `$.team[0].name`, und lassen sich mit einer Aktion kopieren, ebenso der Wert selbst. Das macht den Viewer nützlich beim Debuggen einer API-Antwort, beim Prüfen, welches Feld sich geändert hat, oder beim Weitergeben eines präzisen Pfads an Kolleginnen und Kollegen. Alles bleibt auf deinem Gerät: kein Upload, kein Konto, kein gespeichertes Dokument.
