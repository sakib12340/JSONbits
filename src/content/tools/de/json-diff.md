---
locale: de
toolId: json-diff
title: JSON Diff
description: "Zwei JSON-Dokumente im Browser vergleichen und jede hinzugefügte, entfernte oder geänderte Stelle als filterbare Liste mit Pfaden sehen. Ohne Upload."
summary: "Vergleiche zwei JSON-Dokumente strukturell und prüfe die Unterschiede als lesbare Liste von Pfaden statt als zwei Textwände."
steps:
  - "Füge das ursprüngliche Dokument links und das geänderte rechts ein oder öffne beide aus einer Datei."
  - "Klicke auf Vergleichen oder drücke Ctrl/Cmd+Enter. Identische Dokumente werden sofort gemeldet; andernfalls wird jede Abweichung mit ihrem Pfad aufgelistet."
  - "Filtere nach hinzugefügt, entfernt oder geändert, kopiere einen Pfad oder aktiviere Array-Reihenfolge ignorieren, wenn dieselben Elemente nur umsortiert wurden."
example:
  caption: "Ein struktureller Diff meldet den Pfad und beide Werte für jede Änderung."
  input: |
    Original: { "name": "JSON Bits", "version": 1 }
    Geändert: { "name": "JSON Bits", "version": 2, "private": true }
  output: |
    geändert  $.version   1 → 2
    hinzugefügt  $.private   true
mistakes:
  - "Text statt Daten vergleichen. Schlüsselreihenfolge und Einrückung spielen hier keine Rolle, daher meldet eine neu formatierte Datei keine Änderungen."
  - "Array-Reihenfolge ignorieren, obwohl Positionen wichtig sind. Umsortierte Listenelemente gelten dann als dieselben Werte."
  - "Dokumente vergleichen, die nicht geparst werden können. Korrigiere zuerst die Syntax; die Fehlermeldung nennt Zeile und Spalte."
faq:
  - q: "Ist der Vergleich textuell oder strukturell?"
    a: "Strukturell. Beide Dokumente werden geparst und nach Pfad verglichen, sodass Einrückung, Leerraum und Schlüsselreihenfolge nie als Unterschied erscheinen."
  - q: "Was bewirkt Array-Reihenfolge ignorieren?"
    a: "Es gleicht Array-Elemente nach Wert statt nach Position ab, sodass das Verschieben eines Elements innerhalb einer Liste nicht als Entfernung und Hinzufügung gemeldet wird."
  - q: "Wie groß dürfen die beiden Dokumente sein?"
    a: "Jedes Dokument darf bis zu 20 MB groß sein. Größere Eingaben werden mit einer klaren Meldung abgelehnt, statt einen eingefrorenen Tab zu riskieren."
  - q: "Werden meine Dokumente zum Vergleich hochgeladen?"
    a: "Nein. Beide Dokumente werden in einem Web Worker in diesem Tab geparst und verglichen. Es gibt keinen Serveraufruf, und nach dem Schließen des Tabs wird nichts gespeichert."
  - q: "Zeigt der Diff alte und neue Werte?"
    a: "Ja. Geänderte Zeilen zeigen den vorherigen und den aktuellen Wert nebeneinander, hinzugefügte oder entfernte Zeilen zeigen den Wert, der erschienen oder verschwunden ist."
---

Das JSON Diff Tool vergleicht zwei Dokumente nach Struktur, nicht nach Text. Beide Eingaben werden in einem Web Worker geparst, gemeinsam durchlaufen und zu einer flachen Liste von Pfaden mit einem Typ reduziert: hinzugefügt, entfernt oder geändert. Weil der Vergleich nach dem Parsen stattfindet, erzeugt das Neuformatieren einer Datei, das Umsortieren von Schlüsseln oder eine andere Einrückung nie einen falschen Unterschied.

Jede Zeile enthält den JSONPath der Änderung, den alten Wert und, sofern vorhanden, den neuen Wert. Filter grenzen die Liste auf eine Art von Änderung ein, und ein Pfad lässt sich für einen Fehlerbericht oder einen Test kopieren. Die Option „Array-Reihenfolge ignorieren“ gleicht Listenelemente nach Wert statt nach Position ab – genau richtig, wenn eine API dieselbe Sammlung in anderer Reihenfolge zurückgibt.

Der Diff läuft vollständig in diesem Browser-Tab. Dokumente werden nie hochgeladen, nie im Speicher abgelegt und beim Schließen der Seite verworfen. Jede Seite akzeptiert Dateien bis 20 MB, und identische Dokumente werden als identisch gemeldet, statt eine leere Liste zu erzeugen.
