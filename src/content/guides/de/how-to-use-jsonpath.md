---
locale: de
slug: how-to-use-jsonpath
title: So nutzt du JSONPath
description: "Lerne JSONPath-Syntax an Beispielen: Wurzel, Punkt- und Klammerzugriff, Platzhalter, Filter, Slices und rekursiver Abstieg – lokal im Browser getestet."
updated: 2026-11-23
toolIds:
  - jsonpath-tester
  - json-viewer
  - json-formatter
faq:
  - q: "Was ist JSONPath?"
    a: "JSONPath ist eine Abfragesprache für JSON, vergleichbar mit XPath für XML. Sie wählt Werte aus einem Dokument aus, indem sie einen kompakten, mit $ beginnenden Ausdruck verwendet."
  - q: "Ist JSONPath ein Standard?"
    a: "Es gibt keinen einzigen Standard. Diese Website folgt der gängigen Syntax, die die meisten Werkzeuge verwenden, einschließlich Filtern, Slices und rekursivem Abstieg."
  - q: "Warum hat meine Abfrage nichts zurückgegeben?"
    a: "Prüfe das Wurzelzeichen, die Eigenschaftsnamen und die Array-Indizes. Ein Tippfehler in einem Schlüssel liefert stillschweigend ein leeres Ergebnis statt eines Fehlers."
  - q: "Kann JSONPath ein Dokument verändern?"
    a: "Nein. Es liest und wählt nur Werte aus. Um Daten zu ändern, kopiere das Ergebnis und bearbeite es im Formatierer oder Viewer."
  - q: "Wie viele Ergebnisse können zurückgegeben werden?"
    a: "Der Tester begrenzt sichtbare Treffer aus Gründen der Reaktionsfähigkeit, meldet aber die tatsächliche Gesamtzahl und lässt dich das vollständige Ergebnis herunterladen."
---

Mit JSONPath kannst du einem JSON-Dokument genau die Werte entlocken, die dich interessieren, ohne dafür erst ein Programm zu schreiben. Ein Ausdruck beginnt an der Wurzel (`$`) und läuft von dort über Schlüssel und Array-Indizes. Was wie eine kleine, kryptische Zeichenkette aussieht, ist tatsächlich eine präzise Adresse für eine Stelle im Dokument – und genau das macht die Syntax so nützlich, wenn du Daten in Tests, Überwachungsregeln oder Skripten wiederfinden willst.

## Einfacher Zugriff

- `$` ist das gesamte Dokument.
- `$.store.book` liest eine Eigenschaft namens `book` innerhalb von `store`.
- `$['store']['book']` ist dasselbe, was praktisch ist, wenn ein Schlüssel Leerzeichen oder Sonderzeichen enthält.
- `$.store.book[0]` liest das erste Element eines Arrays.
- `$.store.book[-1]` liest das letzte Element.

Die Punkt-Schreibweise ist kürzer, die Klammer-Schreibweise ist sicherer bei ungewöhnlichen Schlüsseln. Wenn du dir bei einem Schlüssel nicht sicher bist, ist `$['...']` fast immer die robuste Wahl, weil dort auch Leerzeichen und Bindestriche erlaubt sind.

## Platzhalter und Rekursion

- `$.store.book[*]` wählt alle Bücher aus.
- `$..author` findet jedes Feld `author` in beliebiger Tiefe, was bei verstreuten Metadaten hilfreich ist.
- `$.store.book[0,2]` wählt das erste und dritte Buch aus.

Der Doppelpunkt bei Slices und die zwei Punkte beim rekursiven Abstieg sehen auf den ersten Blick ähnlich aus, bedeuten aber etwas Grundverschiedenes: Der eine entnimmt einen Bereich aus einem Array, der andere durchsucht den gesamten Baum.

## Slices

Array-Slices sehen aus wie in Python: `$.store.book[1:3]` wählt die Indizes 1 und 2, und `$.store.book[:2]` nimmt die ersten beiden Elemente. Ein Schritt wie `[::2]` wählt jedes zweite Element. Obergrenzen sind ausschließlich, das heißt, der Index nach dem Doppelpunkt gehört nicht mehr zum Ergebnis – genau wie bei Python-Slices.

## Filter

Filter stehen in eckigen Klammern und beginnen mit `?`:

- `$.store.book[?(@.price < 10)]` wählt Bücher, die weniger als 10 kosten.
- `$.store.book[?(@.category == 'fiction')]` trifft auf einen Zeichenkettenwert zu.
- `$.store.book[?(@.isbn)]` behält Elemente, die ein Feld `isbn` haben.

Das `@` innerhalb eines Filters steht für das gerade betrachtete Element. Verknüpfe Bedingungen mit `&&` und `||`, und negiere sie mit `!`. Vergleiche unterstützen `==`, `!=`, `<`, `<=`, `>` und `>=`. Achte darauf, dass ein Zahlenvergleich nicht auf eine Zeichenkette zutrifft: `"10"` und `10` sind in JSON verschiedene Werte.

## Häufige Fehler

- Das führende `$` vergessen.
- JavaScript-Eigenschaftszugriff wie `store.book` ohne das Wurzelzeichen verwenden.
- Bei Array-Indizes die Nullbasis durcheinanderbringen; `[0]` ist das erste, nicht das zweite Element.
- Erwarten, dass ein Filter das Elternobjekt statt des getroffenen Elements zurückgibt.

Teste Ausdrücke an einem echten Dokument im JSONPath-Tester und sende das Ergebnis über das gemeinsame Menü „Senden an" an ein anderes Werkzeug. So bleibt der Weg von der Abfrage zur Weiterverarbeitung vollständig lokal.

## Arbeiten mit dem Tester

Füge ein Dokument in den Eingabebereich ein oder ziehe es dorthin, tippe einen Ausdruck ein und lies die getroffenen Werte samt ihren Pfaden. Der Tester läuft vollständig in deinem Browser, sodass große Dateien dein Gerät nie verlassen. Wechsle zwischen den Ergebnismodi, um Werte, abgeflachte Arrays, den ersten Treffer, nur Pfade oder Pfade mit zugehörigem Wert zu sehen.

Jeder Treffer zeigt seinen JSONPath, den du direkt in Code kopieren kannst. Liefert eine Abfrage mehr Treffer als die Anzeigegrenze, meldet die Statuszeile die tatsächliche Gesamtzahl, und eine Download-Schaltfläche speichert die vollständige Liste. Das ist besonders bei breiten Platzhaltern wie `$..*` wichtig, bei denen eine einzelne Abfrage schnell Tausende Pfade erzeugen kann.

## Tipps zur Leistung

- Engen mit einem Filter ein, bevor du einen Platzhalter anwendest, damit du nicht den ganzen Baum durchläufst.
- Nutze `$.path` statt `$..`, wenn du die Struktur kennst, denn rekursiver Abstieg scannt jeden Knoten.
- Starte bei sehr großen Dateien mit einem kleinen Beispiel, um den Ausdruck zu bestätigen, und führe ihn dann auf dem vollständigen Dokument aus.
- Halte Ausdrücke lesbar: ein Prädikat pro Filter, und zerlege komplexe Abfragen in mehrere Schritte.

## Die Ergebnisse lesen

Eine erfolgreiche Abfrage gibt ein Array von Treffern zurück, selbst wenn es nur einen gibt. Ein leeres Array bedeutet, dass der Ausdruck gültig war, aber nichts gefunden hat; eine rote Fehlermeldung bedeutet, dass die Syntax selbst abgelehnt wurde. Behebe zuerst Syntaxfehler und passe dann das Prädikat an, bis die Zahl der Treffer deiner Erwartung entspricht. Mit dieser Arbeitsweise wird JSONPath von einer rätselhaften Zeichenkette zu einem verlässlichen Werkzeug für alltägliche JSON-Aufgaben.
