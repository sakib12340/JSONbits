---
locale: de
toolId: json-to-json-schema
title: JSON to JSON Schema
description: "Leite ein JSON-Schema aus einem Beispiel ab – mit erkannten Formaten, Enums, Draft-Einstellungen und Titeloptionen – und validiere dein JSON damit."
summary: "Verwandle ein Beispieldokument in ein JSON-Schema, das du bearbeiten und wiederverwenden kannst. Die Ableitung erkennt Typen, Pflichtschlüssel, Item-Schemas, gängige String-Formate und Enums mit wenigen Werten – alles in deinem Browser."
steps:
  - "Füge ein möglichst repräsentatives JSON-Beispiel in den Eingabebereich ein."
  - "Wähle einen Draft, aktiviere Formaterkennung oder Enum-Erkennung und klicke auf Generieren."
  - "Kopiere oder lade das Schema herunter, oder klicke auf Mit diesem Schema validieren, um es am selben Beispiel zu testen."
example:
  caption: "Ein kleines Beispiel und das daraus abgeleitete Schema."
  input: '{ "name": "Ada", "age": 36, "email": "ada@example.com" }'
  output: '{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" }, "email": { "type": "string", "format": "email" } }, "required": ["name", "age", "email"] }'
mistakes:
  - "Aus einem einzelnen dünnen Beispiel ableiten und annehmen, optionale Schlüssel würden erkannt; ergänze zuerst Fälle, die die Lücken abdecken."
  - "Ein erkanntes Format als Garantie behandeln: JSON-Schema-Anmerkungen beschreiben eine Absicht, und Validierer setzen sie nur um, wenn sie entsprechend konfiguriert sind."
  - "Einen draft-07-Validierer mit einem 2020-12-Schema verwenden, ohne $schema-URI und Schlüsselwörter anzupassen."
faq:
  - q: "Wie entscheidet der Generator, welche Schlüssel Pflicht sind?"
    a: "Bei einem einzelnen Objekt markiert er jeden Schlüssel des Beispiels als Pflichtfeld. Beim Zusammenführen der Objekte in einem Array ist ein Schlüssel nur dann Pflicht, wenn er in jedem Element vorkommt. Das entspricht dem häufigen Fall, dass eine Sammlung von Datensätzen eine stabile Form mit einigen optionalen Feldern teilt."
  - q: "Was passiert, wenn dasselbe Feld unterschiedliche Typen hat?"
    a: "Die zusammengefasste Eigenschaft erhält ein Typ-Array, zum Beispiel [\"string\", \"null\"]. Das ist gültiges JSON Schema und die übliche Art, ein Feld zu beschreiben, das manchmal als null fehlt."
  - q: "Welche String-Formate werden erkannt?"
    a: "Der Generator erkennt date-time, date, email, URI, UUID und IPv4 mit konservativen Mustern. Ein Format ist eine Anmerkung: Es dokumentiert die erwartete Form, und manche Validierer prüfen sie, aber es verändert nie den zugrunde liegenden String-Typ."
  - q: "Wann sollte ich die Enum-Erkennung einschalten?"
    a: "Nutze sie für kleine, feste Vokabulare wie Rollen oder Statuswerte. Der Generator ergänzt ein enum nur, wenn mindestens zwei verschiedene String-Werte vorkommen und es höchstens acht sind, sodass Freitextfelder unberührt bleiben."
  - q: "Kann ich das erzeugte Schema sofort validieren?"
    a: "Ja. Die Schaltfläche Mit diesem Schema validieren übergibt das Schema und dein ursprüngliches Beispiel in derselben Tab-Sitzung an den JSON-Schema-Validator. Nichts wird hochgeladen, und die Übergabe wird gelöscht, sobald der Validierer sie gelesen hat."
  - q: "Ist das Ergebnis ein vollständiges Schema für meine API?"
    a: "Es ist ein Ausgangspunkt, keine Spezifikation. Die Ableitung sieht nur die Werte, die du eingefügt hast. Ergänze Beschreibungen, Einschränkungen und Beispiele selbst und speise mehrere repräsentative Dokumente ein, bevor du dich in einer Pipeline darauf verlässt."
---

Ein JSON Schema ist ein Dokument, das ein anderes Dokument beschreibt: welche Eigenschaften es gibt, welche Typen sie tragen, welche Pflicht sind und welche Werte erlaubt sind. Ein solches Schema von Hand zu schreiben ist langsam, und der erste Entwurf stammt ohnehin meist aus einem Beispiel. Dieses Tool dreht die Reihenfolge um. Du fügst ein repräsentatives JSON-Dokument ein und erhältst ein Schema, das du bearbeiten, teilen oder an einen Validierer übergeben kannst.

## Was die Ableitung abdeckt

Der Generator durchläuft das geparste Dokument und gibt für jeden Wert einen Typ aus. Zeichenketten werden zu `string`, ganze Zahlen zu `integer`, Dezimalzahlen zu `number`, und `true`, `false` sowie `null` werden auf ihre passenden JSON-Schema-Typen abgebildet. Objekte erhalten eine `properties`-Zuordnung und eine `required`-Liste. Arrays erhalten ein `items`-Schema. Genau hier liegt der größte Teil der Arbeit: Enthält ein Array Objekte, führt der Generator sie zu einer gemeinsamen Form zusammen. Die Vereinigung ihrer Schlüssel wird zur Eigenschaftsmenge, während nur Schlüssel in `required` bleiben, die in jedem Element vorkommen. Ein Feld, das in einem Datensatz als Zeichenkette und in einem anderen als null erscheint, wird zu einem Typ-Array, sodass keine Information stillschweigend verloren geht.

Optional kann der Generator eine `format`-Anmerkung für Zeichenketten ergänzen, die wie eine Datum-Uhrzeit, ein Datum, eine E-Mail-Adresse, eine URI, eine UUID oder eine IPv4-Adresse aussehen. Für kleine String-Vokabulare kann er außerdem `enum`-Werte ergänzen, jedoch nur bei zwei bis acht verschiedenen Werten. Du kannst zwischen Draft 2020-12 und Draft-07 wählen, `additionalProperties: false` setzen sowie eine `$schema`-URI und einen Titel einbeziehen.

## So verwendest du es

1. Füge ein JSON-Beispiel ein, das so repräsentativ wie möglich ist. Mehrere Datensätze in einem Array sind nützlicher als einer allein.
2. Wähle einen Draft und die gewünschten Optionen und klicke auf Generieren. Die Arbeit läuft in einem Web Worker, sodass ein großes Beispiel die Seite nicht einfriert.
3. Prüfe das Schema, kopiere oder lade es herunter, oder klicke auf Mit diesem Schema validieren, um das ursprüngliche Beispiel dagegen zu prüfen.

## Das Ergebnis lesen

Ein erzeugtes Schema beschreibt, was beobachtet wurde – kein Vertrag, den jemand unterschrieben hat. Hat dein Beispiel fünf Benutzer und keiner davon ein `phone`-Feld, kann das Schema nicht wissen, dass `phone` erlaubt ist. Umgekehrt beweist eine Format-Anmerkung nicht, dass jeder echte Wert diesem Format folgt; sie hält nur fest, dass es bei den Beispielwerten der Fall war. Behandle die Ausgabe als ersten Entwurf und ergänze die Einschränkungen, die deine Anwendung wirklich braucht: Mindestlängen, numerische Grenzen, Muster, Beschreibungen und Beispiele.

Die Draft-Wahl ist wichtig, sobald du das Schema in ein anderes Tool überträgst. Draft 2020-12 verwendet `https://json-schema.org/draft/2020-12/schema` als `$schema`-URI, Draft-07 das ältere `http://json-schema.org/draft-07/schema#`. Die meisten Validierer erkennen die Dialektversion an dieser URI, daher halte die Option mit dem Validierer konsistent, den du einsetzen willst.

## Datenschutz

Das Beispiel verlässt deinen Browser nie. Die Ableitung läuft in einem Web Worker, das Tool stellt keine Netzwerkanfragen, und das Dokument wird weder im lokalen noch im Sitzungsspeicher abgelegt. Die Schaltfläche, die das Schema an den Validierer sendet, nutzt eine einmalige Übergabe im aktuellen Tab und löscht sie unmittelbar nach dem Lesen.

## Häufige Fehler

Ein leeres oder ungültiges Dokument lässt sich nicht ableiten, und die Fehleranzeige verweist auf die genaue Zeile und Spalte. Ein Array an oberster Ebene wird verarbeitet, enthält es aber keine Objekte, gibt es keine Feldmenge zum Zusammenführen, und `items` bleibt ein leeres Schema. Die Enum-Erkennung ist absichtlich konservativ; wenn du für ein Feld mit nur einem beobachteten Wert eine feste Wertmenge willst, ergänze das enum von Hand.
