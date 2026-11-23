---
locale: de
toolId: json-to-ndjson
title: JSON to JSON Lines
description: "Verwandle ein JSON-Array auf oberster Ebene in zeilengetrenntes JSON – ein kompakter Datensatz pro Zeile, bereit für Logs und Datenpipelines."
summary: "Zerlege ein JSON-Array in einen kompakten JSON-Wert pro Zeile. Das Ergebnis lässt sich leicht anhängen und streamen und wird von Log-Shipper- und Daten-Tools akzeptiert, die JSON Lines erwarten."
steps:
  - "Füge ein JSON-Array ein oder ziehe eine .json-Datei in den Eingabebereich."
  - "Klicke auf Ausführen. Jedes Element wird zu einer Zeile kompakten JSON."
  - "Kopiere die Zeilen oder lade sie als .ndjson-Datei herunter."
example:
  caption: "Ein Array wird zu zwei Datensätzen."
  input: '[{"id":1},{"id":2}]'
  output: '{"id":1}\n{"id":2}'
mistakes:
  - "Ein Objekt statt eines Arrays übergeben; NDJSON braucht eine Folge von Werten auf oberster Ebene."
  - "Einrückung in der Ausgabe erwarten; jeder Datensatz ist absichtlich eine einzelne kompakte Zeile."
  - "Zeilen an eine Datei anhängen, die von einem früheren Export noch die schließende Array-Klammer enthält."
faq:
  - q: "Warum muss die Eingabe ein Array sein?"
    a: "NDJSON stellt eine Folge von Datensätzen dar. Ein Array ist die natürliche Quelle, weil seine Elemente bereits eine geordnete Folge bilden. Ein einzelnes Objekt ergäbe eine Zeile, was zwar gültiges JSON Lines ist, aber fast nie dem entspricht, wer auch immer diese Konvertierung anfordert. Das Tool erklärt die Voraussetzung statt zu raten."
  - q: "Warum steht jeder Datensatz auf einer eigenen Zeile?"
    a: "Die Zeile ist die Grenze des Datensatzes. Würde man einen Datensatz über mehrere Zeilen hübsch drucken, könnte ein Leser einen Strom nicht mehr an Zeilenumbrüchen trennen. Kompakte Ausgabe ist eine Anforderung des Formats, keine Stilentscheidung."
  - q: "Überstehen große Zahlen die Konvertierung?"
    a: "Ja. Der Generator serialisiert Werte aus dem geparsten Syntaxbaum unter Verwendung ihres ursprünglichen Zahlentexts. Eine 64-Bit-Ganzzahl oder eine lange Dezimalzahl wird unverändert ausgegeben, statt durch eine JavaScript-Zahlenkonvertierung gerundet zu werden."
  - q: "Kann ich verschachtelte Arrays oder Objekte konvertieren?"
    a: "Ja. Jedes Element kann ein beliebiger JSON-Wert sein: ein Objekt, ein Array, eine Zeichenkette oder eine Zahl. Verschachtelte Strukturen bleiben innerhalb ihrer eigenen Zeile. Nur das Array auf oberster Ebene wird in Zeilen zerlegt."
  - q: "Was passiert bei einem leeren Array?"
    a: "Die Ausgabe ist leer. Das entspricht dem Format: null Datensätze erzeugen null Zeilen. Ergänze mindestens ein Element, wenn du Inhalt erwartet hast."
  - q: "Werden meine Daten hochgeladen?"
    a: "Nein. Parsing und Serialisierung laufen in einem Web Worker im Browser. Es gibt keine Anfragen an Drittanbieter, keine Analysen der Eingabe und nichts wird dauerhaft gespeichert."
---

Ein JSON-Array ist ein vollständiges Dokument. Eine JSON-Lines-Datei ist eine Folge unabhängiger Dokumente, die zufällig eines pro Zeile gespeichert sind. Der Unterschied klingt klein, verändert aber, wie Daten erzeugt und konsumiert werden. Du kannst an eine JSON-Lines-Datei einen Datensatz anhängen, indem du eine weitere Zeile schreibst; bei einem Array bedeutet Anhängen, die schließende Klammer zu bearbeiten. Log-Shipper und Streaming-Frameworks bevorzugen die zeilenbasierte Form, weil sie mit dem Lesen beginnen können, bevor die Datei fertig ist.

## Was der Konverter tut

Das Tool parst die Eingabe in einen typisierten Syntaxbaum, läuft dann über das Array auf oberster Ebene und schreibt jedes Element als kompakten JSON-Wert gefolgt von einem Zeilenumbruch. Weil der Schreiber den geparsten Baum nutzt statt eines generischen Objekt-Serialisierers, bleiben Zahlentoken exakt erhalten. Eine lange Ganzzahl bleibt lang, und eine Dezimalzahl mit vielen Stellen wird nicht gekürzt. Zeichenketten werden nach den JSON-Regeln escaped, sodass ein Wert mit einem Zeilenumbruch innerhalb seiner eigenen Zeile zu `\n` wird, statt den Datensatz zu zerbrechen.

Die Ausgabe wird schrittweise aufgebaut. Bei einem großen Array gibt der Worker unterwegs Zeilen aus und meldet den Fortschritt, wodurch der Hauptthread frei bleibt. Überschreitet das Ergebnis vier Megabyte, bietet die Seite es als Download an, statt es in einen Editor zu zeichnen. Der Download verwendet den `.ndjson`-Content-Type, damit nachgelagerte Tools das Format erkennen.

## So verwendest du es

1. Füge ein JSON-Array in den Eingabebereich ein oder ziehe eine `.json`-Datei auf die Seite.
2. Klicke auf Ausführen. Das Tool prüft, dass der Wurzelwert ein Array ist.
3. Kopiere die entstandenen Zeilen oder lade sie als `.ndjson`-Datei herunter.

## Warum die Wurzel ein Array sein muss

Das ist eine bewusste Absicherung. Wäre die Eingabe ein Objekt, müsste das Tool entscheiden, ob es das Objekt selbst, seine Werte oder etwas aus seinen Schlüsseln Abgeleitetes schreiben soll. Jede Wahl wäre ein Raten, und eine falsche Wahl würde stillschweigend eine Datei mit der falschen Form erzeugen. Ein klarer Fehler ist sicherer. Willst du eine Zeile aus einem Objekt machen, kannst du es selbst in ein Array packen: `[{"a":1}]` ergibt `{"a":1}`.

Ein häufiger Fehler ist, dem Tool eine Datei zu geben, die wie NDJSON aussieht, aber noch `[` und `]` um das Ganze hat. Diese Klammern machen daraus genau ein JSON-Array, und das ist es, was dieses Tool erwartet. Sie zu entfernen wäre eine andere Operation; dieser Konverter geht davon aus, dass das Array beabsichtigt ist.

## Mit dem Ergebnis arbeiten

Prüfe die erste und letzte Zeile der Ausgabe, bevor du sie an ein anderes System gibst. Jede Zeile muss für sich geparst werden können. Wenn du die Datei von Hand bearbeiten willst, halte Zeilen kurz und verzichte auf Kommentare: JSON Lines kennt keine Kommentarsyntax. Ein Marker wie `_comment` innerhalb eines Datensatzes ist eine Konvention, die manche Tools verstehen, aber letztlich immer noch bloß Daten.

Für die umgekehrte Richtung sammelt JSON Lines to JSON die Datensätze wieder zu einem Array. Die beiden Konvertierungen sind nicht vollkommen symmetrisch, wenn Leerzeilen im Spiel waren, denn Datensätze sind Positionen in einer Folge. Halte fest, ob deine Pipeline leere Zeilen bewahrt, und stelle die Option zum Entfernen entsprechend ein.

## Datenschutz

Deine Daten bleiben auf diesem Gerät. Parsing und Serialisierung finden in einem Web Worker statt, die Seite stellt während der Nutzung keine Netzwerkanfragen, und es wird kein Inhalt in die URL gesetzt oder gespeichert. Die Datenschutzseite beschreibt dieselben Garantien in verständlicher Sprache.

## Häufige Fehler

Ein Syntaxfehler in Zeile eins bedeutet meist, dass die Eingabe überhaupt kein JSON ist oder ein nachgestelltes Komma hat. Die Meldung „muss ein Array auf oberster Ebene sein" bedeutet, dass der Wurzelwert ein Objekt, eine Zeichenkette oder eine Zahl ist. Packe ihn in ein Array, wenn das deine Absicht war.
