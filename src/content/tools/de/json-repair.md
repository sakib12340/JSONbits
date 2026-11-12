---
locale: de
toolId: json-repair
title: JSON Repair
description: "Ungültiges JSON im Browser reparieren: Kommas, Kommentare, Anführungszeichen, Schlüssel ohne Quotes und Python-Literale – mit Liste der Korrekturen."
summary: "Behebe die mechanischen Fehler, die JSON ungültig machen, und sieh genau, welche Korrekturen angewendet wurden, bevor du das Ergebnis verwendest."
steps:
  - "Füge das defekte Dokument ein oder ziehe eine Datei hinein. Drücke Reparieren oder Ctrl/Cmd+Enter; das Beispiel enthält mehrere häufige Fehler auf einmal."
  - "Prüfe die Liste der angewendeten Korrekturen, etwa entfernte nachgestellte Kommas oder ersetzte typografische Anführungszeichen, neben der reparierten Ausgabe."
  - "Kopiere das bereinigte JSON oder lade es herunter und prüfe es anschließend mit dem Validator, bevor du es auslieferst."
example:
  caption: "Der Reparaturbericht nennt jede Änderung, damit nichts unbemerkt korrigiert wird."
  input: |
    {
      name: 'JSON Bits',   // product name
      "private": True,
    }
  output: |
    {
      "name": "JSON Bits",
      "private": true
    }
mistakes:
  - "Ein Dokument reparieren, dem ein Wert oder eine Klammer fehlt. Mechanische Korrekturen können keine Daten erfinden, daher scheitert das Ergebnis weiterhin an der Validierung."
  - "Annehmen, die reparierte Ausgabe sei inhaltlich korrekt. Prüfe die Änderungsliste; ein entfernter Kommentar kann Informationen enthalten haben."
  - "Reparatur auf ein Dokument anwenden, das gar kein JSON ist, etwa ein JavaScript-Modul mit Imports und Ausdrücken."
faq:
  - q: "Welche Fehler lassen sich automatisch reparieren?"
    a: "Kommentare, nachgestellte Kommas, Zeichenketten in einfachen Anführungszeichen, typografische Anführungszeichen, Schlüssel ohne Anführungszeichen und Python-Literale wie None, True und False. Jede Korrektur wird aufgelistet, damit du sie prüfen kannst."
  - q: "Verändert die Reparatur meine Daten?"
    a: "Sie schreibt nur die Syntax um. Schlüssel, Werte und ihre Reihenfolge bleiben gleich, und Zahlentoken werden beibehalten statt neu berechnet."
  - q: "Kann die Reparatur eine fehlende schließende Klammer ergänzen?"
    a: "Nicht zuverlässig. Das Werkzeug behebt häufige Satzzeichen- und Anführungsfehler; ein strukturell unvollständiges Dokument braucht eine manuelle Korrektur, und der Validator zeigt, wo es bricht."
  - q: "Sollte ich der reparierten Ausgabe vertrauen?"
    a: "Prüfe zuerst die Änderungsliste. Reparaturen sind deterministisch und werden ausdrücklich angezeigt, aber das Entfernen eines Kommentars oder das Umwandeln von True in true solltest du bestätigen."
  - q: "Wird das defekte JSON an einen Server gesendet?"
    a: "Nein. Die Reparatur läuft in einem Web Worker in diesem Tab, daher bleiben ungültige und gültige Dokumente gleichermaßen auf deinem Gerät."
---

JSON Repair kümmert sich um die Fehler, die ein Dokument aus langweiligen, mechanischen Gründen ungültig machen. Kommentare, nachgestellte Kommas, einfache Anführungszeichen, typografische Anführungszeichen aus einem Textverarbeitungsprogramm, Schlüssel ohne Anführungszeichen und Python-Literale wie `True` oder `None` werden in gültiges JSON umgeschrieben, und jede Änderung wird aufgelistet, damit das Ergebnis keine Blackbox ist.

Die Reparatur läuft in einem Web Worker, sodass die Seite auch bei großer Eingabe reagiert. Zahlentoken werden als Text kopiert, wodurch ein repariertes Dokument seine 64-Bit-Ganzzahlen und langen Dezimalzahlen intakt behält. Die Ausgabe lässt sich sofort kopieren oder herunterladen.

Reparatur ist eine Erleichterung, kein Ersatz für Prüfung. Wenn ein Kommentar eine Bedeutung trug oder ein Python-Literal absichtlich dort stand, zeigt dir die Änderungsliste, was passiert ist, damit du entscheiden kannst. Führe das Dokument nach der Reparatur durch den JSON Validator, um zu bestätigen, dass es parst, und arbeite dann mit dem Formatierer oder Viewer weiter. An keiner Stelle wird etwas hochgeladen.
