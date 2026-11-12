---
locale: de
toolId: json-minifier
title: JSON Minifier
description: "JSON minifizieren: Leerraum entfernen, ohne Werte oder Zahlenpräzision zu verändern. Sieh, wie viele Bytes du sparst, und kopiere oder lade das Ergebnis."
summary: "Entferne unbedeutenden Leerraum aus JSON und sieh genau, wie viel kleiner das Dokument wird."
steps:
  - "Füge das JSON ein, das du komprimieren möchtest, oder ziehe es hinein. Das Beispiel zeigt ein formatiertes Dokument mit verschachtelten Objekten und Arrays."
  - "Klicke auf Minimieren oder drücke Ctrl/Cmd+Enter. Die Statistikleiste meldet Eingabegröße, Ausgabegröße und die eingesparten Prozent."
  - "Kopiere das kompakte Ergebnis oder lade es als minified.json herunter – für eine Konfigurationsdatei, eine API-Nutzlast oder ein Bundle."
example:
  caption: "Dasselbe Dokument nach der Minifizierung, mit der Größenersparnis über der Ausgabe."
  input: |
    {
      "name": "JSON Bits",
      "tags": ["json", "minify"],
      "private": true
    }
  output: '{"name":"JSON Bits","tags":["json","minify"],"private":true}'
mistakes:
  - "Ungültiges JSON zu minifizieren erzeugt einen Fehler statt einer Ausgabe. Führe zuerst den Validator oder das Reparaturwerkzeug aus."
  - "Leerraum innerhalb einer Zeichenkette zu entfernen würde den Wert beschädigen, daher entfernt der Minifier nur Leerraum zwischen Token."
  - "Späteres Neuformatieren stellt die Lesbarkeit wieder her, aber ein Produktionsserver oder Bundle sollte die kompakte Form ausliefern."
faq:
  - q: "Verändert das Minifizieren meine Werte?"
    a: "Nein. Nur Leerraum zwischen Token wird entfernt. Zeichenketten, Schlüssel, Zahlentoken und ihre Reihenfolge bleiben exakt wie geschrieben, einschließlich großer Ganzzahlen und langer Dezimalzahlen."
  - q: "Wie viel Platz spart die Minifizierung?"
    a: "Das hängt von der Einrückung ab. Mit zwei Leerzeichen formatiertes JSON schrumpft oft um 20 bis 40 Prozent, während bereits kompakte Eingaben kaum oder gar nichts sparen."
  - q: "Ist das minifizierte JSON weiterhin gültig?"
    a: "Ja, wenn die Eingabe gültig war. Die Ausgabe ist dasselbe Dokument ohne unbedeutenden Leerraum, sodass jeder Parser es identisch liest."
  - q: "Kann ich eine Datei statt eingefügtem Text minifizieren?"
    a: "Ja. Ziehe eine .json-Datei auf die Seite oder nutze Datei öffnen. Große Dateien werden im Hintergrund-Worker verarbeitet, und das Ergebnis lässt sich direkt herunterladen."
  - q: "Warum warnt die Seite ab 50 MB?"
    a: "Sehr große Dokumente können den Arbeitsspeicher des Tabs erschöpfen. Die Warnung lässt dich entscheiden, bevor ein Lauf startet, der einige Sekunden dauern kann."
---

Der JSON Minifier entfernt den Leerraum, der JSON lesbar macht, aber Bytes kostet: Einrückungen, Zeilenumbrüche und Leerzeichen um Satzzeichen. Er parst das Dokument sicher und gibt es ohne diese Zeichen wieder aus, sodass ein byte-gleiches JSON entsteht, das jeder Parser identisch liest.

Der Umgang mit Zahlen ist bewusst gewählt. Statt in JavaScript-Zahlen zu parsen und sie erneut zu serialisieren, behält der Minifier Zahlentoken als Text, sodass aus `9007199254740993` nicht `9007199254740992` wird und `4.999999999999999` jede Ziffer behält. Zeichenketten werden nie angefasst: Leerraum innerhalb eines Werts bleibt erhalten, Leerraum zwischen Token nicht.

Die Statistikleiste zeigt die Größe vorher und nachher sowie die eingesparten Prozent – nützlich, wenn du prüfen willst, ob sich Komprimierung lohnt oder ob gzip die Arbeit bereits erledigt. Alles läuft in diesem Tab. Dein JSON wird nicht hochgeladen, gespeichert oder protokolliert, und der Download wird lokal aus dem Ergebnis erzeugt.
