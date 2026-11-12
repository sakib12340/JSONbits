---
locale: de
toolId: json-validator
title: JSON Validator
description: "JSON-Syntax im Browser prüfen und Zeile und Spalte jedes Fehlers erhalten – mit verständlichen Hinweisen. Nichts wird hochgeladen oder gespeichert."
summary: "Prüfe, ob ein Dokument gültiges JSON ist, und sieh genau, wo und warum es scheitert, wenn nicht."
steps:
  - "Füge JSON in den Eingabebereich ein oder ziehe eine .json-Datei auf die Seite. Die Schaltfläche Beispiel lädt ein kurzes Dokument, das du absichtlich kaputt machen kannst."
  - "Klicke auf Prüfen oder drücke Ctrl/Cmd+Enter. Die Prüfung ist ein Syntaxcheck und dauert selbst bei großen Dokumenten nur Millisekunden."
  - "Lies das Ergebnis. Gültiges JSON meldet die Anzahl von Objekten, Arrays, Schlüsseln und Werten; ungültiges JSON nennt Zeile, Spalte und eine Korrektur."
example:
  caption: "Ein nachgestelltes Komma wird in der Zeile und Spalte gemeldet, an der der Parser gestoppt hat."
  input: |
    {
      "name": "JSON Bits",
      "private": true,
    }
  output: |
    Ungültiges JSON
    Zeile 4, Spalte 1
    Hinweis: Entferne das nachgestellte Komma vor der schließenden Klammer.
mistakes:
  - "Ein nachgestelltes Komma nach der letzten Eigenschaft ist der häufigste Fehler. JSON erlaubt ein Komma nur zwischen Elementen, nie nach dem letzten."
  - "Kommentare, Schlüssel ohne Anführungszeichen und einfache Anführungszeichen stammen aus JavaScript-Gewohnheiten und werden von der JSON-Grammatik abgelehnt."
  - "Rohe Zeilenumbrüche oder Tabs innerhalb einer Zeichenkette sind ungültig; verwende stattdessen die Escape-Formen \\n und \\t."
  - "Zwei Werte nebeneinander oder ein fehlendes Komma zwischen Eigenschaften erzeugen einen Fehler, der auf den zweiten Wert zeigt statt auf das fehlende Komma."
faq:
  - q: "Ist das ein JSON-Schema-Validator?"
    a: "Noch nicht. Diese Seite prüft nur die JSON-Syntax, woran die meisten defekten Dokumente scheitern. Ein eigener JSON-Schema-Validator ist als späteres Werkzeug geplant."
  - q: "Werden meine Daten bei der Prüfung irgendwohin gesendet?"
    a: "Nein. Die Prüfung läuft in einem Web Worker in diesem Tab, und die Seite ist so gebaut, dass sie bei geöffnetem Werkzeug keine Netzwerkanfragen stellen kann."
  - q: "Wie genau ist die Fehlerstelle?"
    a: "Der Validator meldet die Zeile und Spalte, an der das Parsen gestoppt hat, zeigt einen Ausschnitt mit dem beanstandeten Zeichen und ergänzt einen Hinweis auf die wahrscheinliche Ursache."
  - q: "Kann ich eine große Datei prüfen?"
    a: "Ja. Dateien bis 100 MB werden akzeptiert. Große Dokumente laufen auf Anforderung mit Fortschrittsanzeige, und das Ergebnis bleibt eine Zusammenfassung, statt die Datei als Text darzustellen."
  - q: "Bedeutet gültiges JSON, dass die Daten korrekt sind?"
    a: "Nein. Syntaktische Gültigkeit heißt nur, dass das Dokument der JSON-Grammatik folgt. Pflichtfelder, Typen und Geschäftsregeln brauchen ein Schema oder eigene Prüfungen."
---

Der JSON Validator beantwortet genau eine Frage: Folgt dieses Dokument der JSON-Grammatik, und wenn nicht, wo bricht es? Füge ein Dokument ein, ziehe eine Datei hinein oder lade das Beispiel und klicke auf Prüfen. Die Prüfung läuft in einem Web Worker, sodass selbst eine mehrere Megabyte große Datei untersucht wird, ohne Scrollen oder Tippen auf der Seite zu blockieren.

Bei gültiger Eingabe fasst das Ergebnis das Dokument zusammen: wie viele Objekte und Arrays es enthält, wie viele Werte und Schlüssel gezählt wurden und wie lange die Prüfung gedauert hat. Bei ungültiger Eingabe meldet das Panel die Zeile und Spalte, an der das Parsen gestoppt hat, zeigt die umgebenden Zeichen und erklärt die wahrscheinliche Ursache in verständlichen Worten – zum Beispiel, dass ein Komma vor einer schließenden Klammer nicht erlaubt ist.

Die Validierung verändert deine Daten nicht und speichert sie nicht. Nichts wird hochgeladen, und das Dokument verschwindet beim Schließen des Tabs. Nutze den Formatierer, wenn du dieselbe Prüfung plus eingerückte Ausgabe möchtest, oder JSON Repair, wenn die Fehler mechanisch sind und du sie lieber automatisch beheben lassen willst.
