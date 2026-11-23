---
locale: de
toolId: jsonpath-tester
title: JSONPath Tester
description: "Teste JSONPath-Abfragen mit deinem JSON und sieh jeden Treffer mit Pfad und Wert. Filter, Slices und Unions. Läuft im Browser, nichts wird hochgeladen."
summary: "Führe einen JSONPath-Ausdruck gegen ein Dokument aus und lies jeden Treffer mit seinem genauen Pfad und Wert, inklusive Laufzeit und Hinweisen zur Kürzung."
steps:
  - "Füge ein Dokument und einen Ausdruck wie $.store.books[?(@.price < 10)] ein, oder nutze das Beispiel, um Filter und Slices zu sehen."
  - "Klicke auf Ausführen oder drücke Ctrl/Cmd+Enter. Das Ergebnis listet jeden Treffer mit Pfad und Wert, plus Gesamtzahl und benötigter Zeit."
  - "Kopiere das ganze Ergebnis oder lade es als .json-Datei herunter und füge den Ausdruck in deiner Bibliothek oder deinem Test ein."
example:
  caption: "Ein Filter liefert einen Treffer, und das Ergebnis behält Ausdruck, Pfad, Wert und Laufzeit."
  input: |
    {
      "store": {
        "books": [
          { "title": "A", "price": 8 },
          { "title": "B", "price": 14 }
        ]
      }
    }
  output: |
    {
      "expression": "$.store.books[?(@.price < 10)]",
      "matches": [
        { "path": "$.store.books[0]", "value": { "title": "A", "price": 8 } }
      ],
      "total": 1,
      "truncated": false,
      "timeMs": 1
    }
mistakes:
  - "Filterbedingungen in Klammern gruppieren. Diese Teilmenge unterstützt && und || ohne Klammern – teile eine zusammengesetzte Bedingung lieber auf."
  - "Zeichenkettenwerte im Filter nicht in Anführungszeichen setzen. Zahlen vergleichst du direkt, einen String-Vergleich schreibst du als [?(@.status == 'open')]."
  - "Annehmen, dass jede JSONPath-Implementierung gleich funktioniert. Rekursiver Abstieg, Unions und Filter unterscheiden sich je nach Bibliothek – prüfe im Zielsystem."
  - "Einen breiten Ausdruck wie $..* schreiben und alles zurückerwarten. Treffer sind auf 2.000 und das Ergebnis auf rund 2 MB begrenzt."
faq:
  - q: "Welche JSONPath-Syntax wird unterstützt?"
    a: "Das Wurzelzeichen $, Punkt- und Klammerschlüssel, Array-Indizes einschließlich negativer, Platzhalter, rekursiver Abstieg, Slices, Unions sowie Filter mit Vergleichsoperatoren, Existenzprüfung, !, && und ||."
  - q: "Können Filter Zeichenketten vergleichen?"
    a: "Ja, mit einfachen oder doppelten Anführungszeichen, gegen Strings, Zahlen, true, false und null. Ein bloßer Membername wie @.id prüft die Existenz, und ! negiert diese Prüfung."
  - q: "Warum steht im Ergebnis „gekürzt“?"
    a: "Jeder Wert ist auf 20.000 Zeichen, die Trefferliste auf 2.000 Einträge und das ganze Ergebnis auf etwa 2 MB begrenzt. Bei einer Grenze wird das Flag gesetzt, damit ein Teilresultat nie für ein vollständiges gehalten wird."
  - q: "Wo werden Syntaxfehler angezeigt?"
    a: "Direkt unter dem Abfragefeld, damit eine fehlende Klammer oder ein nicht unterstützter Operator neben genau dem Ausdruck gemeldet wird, der ihn verursacht hat."
  - q: "Verlässt das Dokument den Browser?"
    a: "Nein. Die Abfrage läuft in einem Web Worker in diesem Tab. Dokument und Ergebnis bleiben auf dem Gerät, und es wird nichts in einen dauerhaften Speicher geschrieben."
---

JSONPath ist eine kleine Abfragesprache für JSON, das Äquivalent zu einem CSS-Selektor für ein Dokument. Der JSONPath Tester führt einen Ausdruck gegen deine Daten aus und liefert ein strukturiertes Ergebnis statt einer unübersichtlichen Liste von Treffern. Das ist praktisch, wenn du eine Abfrage prüfen willst, bevor sie in einen Test, eine Überwachungsregel oder Anwendungscode wandert. Statt nur Werte zu sehen, bekommst du zu jedem Treffer den exakten Pfad, mit dem du ihn im Dokument wiederfindest.

Die unterstützte Teilmenge umfasst die Syntax, auf die sich die meisten Bibliotheken einigen. `$` ist die Wurzel, `.key` und `['key']` lesen eine Eigenschaft, `[0]` und `[-1]` adressieren ein Array-Element, und `[*]` oder `.*` wählen alle Kinder aus. Rekursiver Abstieg mit `..key` oder `..*` durchsucht jede Ebene, Slices wie `[1:4:2]` entnehmen einen Bereich, und Unions wie `[0,2]` oder `['a','b']` fassen mehrere Auswahlen zusammen. Filter arbeiten mit `[?(@.price < 10)]` sowie `==`, `!=`, `<`, `<=`, `>` und `>=` und vergleichen dabei Zeichenketten, Zahlen, `true`, `false` oder `null`. Ein Ausdruck wie `[?(@.id)]` prüft die Existenz, `!` negiert sie, und `&&` sowie `||` verknüpfen Bedingungen ohne Klammern.

Die Ausgabe ist JSON, das du behalten kannst. Sie hält den Ausdruck, eine Liste von Treffern mit `path` und `value`, die Gesamtzahl `total`, das Flag `truncated` und die Laufzeit in Millisekunden fest. Diese Form lässt sich bequem in einen Fehlerbericht oder einen Testschnappschuss einfügen. Die Pfade verwenden dieselbe Schreibweise, die auch der Viewer kopiert, sodass sich jeder Treffer bis zur ursprünglichen Stelle im Dokument zurückverfolgen lässt.

Zwei Gewohnheiten machen einen Ausdruck verlässlich. Starte mit der breitesten Version der Abfrage, etwa `$.items[*]`, und vergleiche die Trefferzahl mit etwas, das du von Hand nachprüfen kannst. Liefert ein Filter weniger Zeilen als erwartet, steckt meist ein Typkonflikt dahinter: `"10"` und `10` sind verschiedene Werte, und ein numerischer Vergleich trifft nicht auf eine Zeichenkette zu. Führe anschließend denselben Ausdruck im Tool und in der Bibliothek aus, die ihn später in Produktion ausführt. Gerade beim rekursiven Abstieg und bei Unions gehen die Implementierungen am stärksten auseinander, weshalb eine hier funktionierende Abfrage in einem Python- oder Java-Client unter Umständen leicht umgeschrieben werden muss.

Die Ergebnisgröße ist absichtlich begrenzt. Ein einzelner Wert endet bei 20.000 Zeichen, die Trefferliste bei 2.000 Einträgen und das gesamte Ergebnis bei ungefähr 2 MB; `truncated` wird gesetzt, sobald eine Grenze greift. Ein breiter Ausdruck auf einem großen Dokument liefert daher schnell ein Ergebnis, statt den Tab zu blockieren. Da alles in einem Web Worker passiert, bleiben Tippen und Scrollen während der Abfrage flüssig.

Abfragen laufen in einem Web Worker auf einem Dokument, das den Browser nie verlässt. Für das manuelle Erkunden eines Dokuments zeigt der [JSON Viewer](/json-viewer) dieselben Pfade als Baum, und der [JSON Schema Validator](/json-schema-validator) prüft die Struktur der Daten, die du gefunden hast. Zusammengenommen decken diese Werkzeuge den Weg von der ersten Frage über die Sichtbarmachung bis zur formellen Validierung ab, ohne dass deine Daten zwischendurch eine einzige Netzwerkanfrage auslösen.
