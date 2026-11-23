---
locale: de
toolId: ndjson-to-json
title: JSON Lines to JSON
description: "Wandle JSON Lines in ein JSON-Array um, überspringe ungültige Datensätze oder brich beim ersten Fehler ab, mit Formatierung und Leerzeilen-Kontrolle."
summary: "Sammle zeilengetrennte JSON-Datensätze in einem einzigen Array. Bestimme, wie ungültige und leere Zeilen behandelt werden, und formatiere Datensätze auf Wunsch, ohne Zahlenwerte zu verändern."
steps:
  - "Füge JSON Lines in den Eingabebereich ein oder ziehe eine Datei dorthin."
  - "Lege fest, ob ungültige Zeilen übersprungen, Leerzeilen entfernt und Datensätze formatiert werden sollen."
  - "Klicke auf Ausführen und kopiere das entstandene JSON-Array oder lade es herunter."
example:
  caption: "Zwei Zeilen werden zu einem Array."
  input: '{"id":1}\n{"id":2}'
  output: '[{"id":1},{"id":2}]'
mistakes:
  - "Davon ausgehen, ungültige Zeilen würden standardmäßig verworfen; wähle Ungültige Zeilen überspringen ausdrücklich aus."
  - "Einen riesigen Datensatz formatieren, obwohl ein kompaktes Array viel schneller heruntergeladen würde."
  - "Vergessen, dass Leerzeilen erhalten bleiben, solange Leerzeilen entfernen nicht aktiviert ist."
faq:
  - q: "Was genau wird erzeugt?"
    a: "Ein einziges JSON-Array, dessen Elemente die Werte aus jeder nicht leeren Zeile in ihrer Reihenfolge sind. Enthält eine Zeile ein Objekt oder eine Zahl, wird genau dieser Wert zum entsprechenden Element. Das Tool erfindet keine Schlüssel und verpackt Datensätze nicht, solange du keine Formatierung einschaltest."
  - q: "Was passiert mit ungültigen Zeilen?"
    a: "Standardmäßig bricht der Lauf bei der ersten schlechten Zeile ab und meldet Nummer, Spalte und einen Hinweis. Schalte Ungültige Zeilen überspringen ein, um über Probleme hinweg fortzufahren; diese Datensätze fehlen dann in der Ausgabe. Brauchst du ein vollständiges Fehlerverzeichnis, nutze zuerst den NDJSON Validator."
  - q: "Werden Leerzeilen übernommen?"
    a: "Leerzeilen werden zu null-Werten, solange Leerzeilen entfernen aus ist, weil sie immer noch eine Position in der Folge einnehmen. Mit aktiviertem Entfernen verschwinden sie vollständig, und das Array enthält nur Datensätze aus nicht leeren Zeilen."
  - q: "Verändert die Formatierung die Daten?"
    a: "Nein. Die Formatierung wirkt auf den Text jedes Datensatzes, und Zahlentoken bleiben so erhalten, wie sie geschrieben wurden. Eine große Ganzzahl wie 9007199254740993 bleibt exakt, statt über eine JavaScript-Zahl gerundet zu werden."
  - q: "Kann das sehr große Dateien verarbeiten?"
    a: "Ja. Zeilen werden aus dem übertragenen Dateipuffer in Blöcken gelesen, und während des Laufs wird Fortschritt gemeldet. Dateien oberhalb der Vorschaugrenze brauchen einen ausdrücklichen Start, und Ausgaben über vier Megabyte werden als Download angeboten statt in den Editor geladen zu werden."
  - q: "Wird irgendetwas hochgeladen?"
    a: "Nein. Lesen, Konvertieren und Formatieren finden vollständig in deinem Browser statt. Während der Nutzung gibt es keine Netzwerkanfrage und keine dauerhafte Speicherung deiner Daten."
---

JSON Lines ist praktisch für Produzenten und Stream-Prozessoren, doch die meisten JSON-Tools erwarten ein einzelnes Array oder Objekt. Der Wechsel zwischen diesen beiden Formen ist ein üblicher erster Schritt, bevor Daten analysiert, in eine Datenbank importiert oder an einen Formatierer übergeben werden. Dieses Tool sammelt die Zeilen zu einem Array und gibt dir dabei ausdrückliche Kontrolle über die unordentlichen Teile: defekte Datensätze, Leerzeilen und die Größe der Ausgabe.

## Das Konvertierungsmodell

Der Worker liest die Eingabe in Blöcken und trennt dabei nach Zeilenumbrüchen. Jede vollständige Zeile wird geparst, um zu bestätigen, dass sie gültiges JSON ist. Gültige Zeilen werden an ein Ausgabe-Array angehängt, wobei ihr ursprünglicher Text erhalten bleibt, damit Zahlen ihre exakte Darstellung behalten. Ist Formatierung eingeschaltet, wird jeder Datensatz vor dem Hinzufügen mit zwei Leerzeichen eingerückt. Das Ergebnis wird in einem Streaming-Builder zusammengesetzt, sodass die Seite nie gleichzeitig eine riesige Quellzeichenkette und mehrere Kopien der Ausgabe im Speicher hält.

Ungültige Zeilen werden nach deiner Wahl behandelt. Beim Standardverhalten bricht der Lauf beim ersten Problem ab, und die Fehleranzeige nennt Zeilennummer, Spalte und einen verständlichen Hinweis. Ungültige Zeilen überspringen führt über diese Stellen hinweg und lässt die betreffenden Datensätze im Array weg. Keiner der beiden Modi verändert einen Datensatz stillschweigend: Eine Zeile, die sich parsen lässt, wird unverändert kopiert, und eine Zeile, die sich nicht parsen lässt, beendet entweder den Auftrag oder wird ausgelassen.

Leerzeilen sind ein eigener Fall. Ein abschließender Zeilenumbruch am Ende der Datei ist normal und erzeugt für sich allein keinen leeren Datensatz. Leere Zeilen in der Mitte hingegen sind weiterhin Positionen in der Folge. Ohne Entfernen werden sie zu `null`-Elementen; mit Entfernen verschwinden sie. Den meisten Exporten tut das Entfernen gut.

## So verwendest du es

1. Füge JSON Lines in den Eingabebereich ein oder ziehe eine `.ndjson`- oder `.jsonl`-Datei auf die Seite.
2. Lege die Optionen für ungültige Zeilen, Leerzeilen und Formatierung fest.
3. Klicke auf Ausführen. Kopiere das Array oder lade es als `result.txt` herunter, wenn die Ausgabe groß ist.

## Die Ausgabegröße wählen

Formatierung macht ein Ergebnis lesbarer, kann aber seine Größe verdoppeln oder verdreifachen. Bei einer Datei mit Hunderttausenden Datensätzen ist ein kompaktes Array meist die bessere Wahl, weil es schneller herunterlädt und vom nächsten Tool ohne erneute Formatierung verarbeitet werden kann. Willst du nur ein paar Datensätze ansehen, starte mit Formatierung und wechsle zum JSON Viewer, um sie zu durchsuchen.

Überschreitet die Ausgabe vier Megabyte, liefert der Worker sie als Blob zurück. Die Seite zeigt dann ihre Größe an und bietet eine Download-Schaltfläche, statt Millionen Zeichen in einen Editor zu zeichnen. Das ist derselbe Pfad für große Ausgaben wie bei den Konvertern und genau das, was den Browser auch bei großen Datensätzen reaktionsfähig hält.

## Datenschutz

Die Datei wird in einem Web Worker auf deinem Gerät dekodiert und verarbeitet. Nichts wird hochgeladen, keine Analysen beobachten die Eingabe, und kein Abfrageparameter enthält die Daten. Die Content-Security-Policy der Website enthält `connect-src 'none'`, was die Aussage über null Netzwerkanfragen überprüfbar statt reiner Vertrauenssache macht.

## Häufige Fehler

Ein Fehler zur „Kodierung" bedeutet, dass die Datei in einem anderen Format als UTF-8 gespeichert wurde; speichere sie erneut als UTF-8. Ein Syntaxfehler mit Zeilennummer verweist auf einen Datensatz, der kein vollständiges JSON ist. Wenn jede Zeile gültig aussieht, der Lauf aber trotzdem stoppt, suche nach unsichtbaren Zeichen wie einer Byte-Order-Mark am Anfang der ersten Zeile.
