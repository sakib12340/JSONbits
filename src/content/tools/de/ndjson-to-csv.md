---
locale: de
toolId: ndjson-to-csv
title: JSON Lines to CSV
description: "Konvertiere JSON-Lines-Datensätze in CSV mit Abflachung über Punktpfade, RFC-4180-Quoting, Kopfzeile und Schutz vor Formeln in Tabellenprogrammen."
summary: "Wandle zeilengetrennte JSON-Datensätze in eine tabellenfreundliche CSV um. Verschachtelte Objekte werden zu Punktpfad-Spalten, Werte nach RFC 4180 in Anführungszeichen gesetzt, und formelartige Zellen lassen sich entschärfen."
steps:
  - "Füge JSON Lines ein oder ziehe eine Datei herunter, deren Zeilen Objekte enthalten."
  - "Wähle Trennzeichen, Abflachung, Kopfzeile und den Schutz vor Formeln."
  - "Klicke auf Ausführen und kopiere die CSV oder lade sie als Datei herunter."
example:
  caption: "Verschachtelte Objekte werden zu Punktpfad-Spalten."
  input: '{"name":"Ada","address":{"city":"London"}}\n{"name":"Grace","address":{"city":"New York"}}'
  output: 'name,address.city\nAda,London\nGrace,"New York"'
mistakes:
  - "Davon ausgehen, jede Zeile sei ein Objekt; skalare Datensätze können keine CSV-Zeilen werden und werden als Fehler gemeldet."
  - "Den Formelschutz abschalten, obwohl die CSV in einem Tabellenprogramm geöffnet wird."
  - "Vergessen, dass die Abflachung Spaltennamen mit Punkten erzeugt, die im Zielsystem möglicherweise umbenannt werden müssen."
faq:
  - q: "Wie werden verschachtelte Objekte behandelt?"
    a: "Bei aktiver Abflachung wird ein verschachtelter Schlüssel zu einem Spaltennamen mit Punkt, etwa address.city. Tieferliegende Verschachtelungen folgen demselben Muster. Arrays werden als JSON-Text in einer Zelle serialisiert, sofern du nicht auf eine verbundene Darstellung umgestellt hast. Ohne Abflachung wird ein Objektwert als sein JSON-Text geschrieben."
  - q: "Wie wird entschieden, wann in Anführungszeichen gesetzt wird?"
    a: "Der Schreiber folgt RFC 4180. Ein Feld wird in doppelte Anführungszeichen gesetzt, wenn es das Trennzeichen, ein Anführungszeichen, einen Wagenrücklauf, einen Zeilenumbruch oder führende bzw. abschließende Leerzeichen enthält. Eingebettete Anführungszeichen werden verdoppelt. Zeilen enden mit CRLF, wie es Tabellenprogramme erwarten."
  - q: "Was bewirkt der Formelschutz?"
    a: "Eine Zelle, die mit =, +, -, @, einem Tabulator oder einem Wagenrücklauf beginnt, kann von Tabellenprogrammen als Formel interpretiert werden. Der Schutz stellt solchen Werten ein Apostroph voran, damit sie als Text gelesen werden. Schalte ihn ein, wann immer die CSV in Excel oder einem ähnlichen Programm geöffnet wird."
  - q: "Was passiert bei einer ungültigen Zeile?"
    a: "Standardmäßig bricht der Lauf an dieser Zeile ab und meldet sie. Schalte Ungültige Zeilen überspringen ein, um mit den restlichen Datensätzen fortzufahren. Zeilen, die sich parsen lassen, aber keine Objekte sind, werden getrennt gemeldet, denn ein Skalar kann keine CSV-Spalten liefern."
  - q: "Stammen die Spaltennamen aus jedem Datensatz?"
    a: "Spalten werden in der Reihenfolge ihres ersten Auftretens über alle behaltenen Datensätze gesammelt. Taucht ein Schlüssel erst in einem späteren Datensatz auf, haben frühere Zeilen in dieser Spalte einfach eine leere Zelle. Das entspricht dem Verhalten der meisten CSV-Exporte."
  - q: "Verlässt mein Daten den Browser?"
    a: "Nein. Parsing und CSV-Schreiben laufen beide in einem Web Worker. Es gibt keine Uploads, keine Analysen und keine Anfragen an Drittanbieter; die Content-Security-Policy verbietet ausgehende Verbindungen."
---

CSV und JSON Lines lösen unterschiedliche Probleme. JSON Lines ist hervorragend für Maschinen: Jede Zeile ist ein vollständiger JSON-Wert, und neue Datensätze lassen sich günstig anhängen. CSV ist hervorragend für Menschen: Tabellenprogramme, Datenbanken und Berichtswerkzeuge öffnen sie direkt. Die Konvertierung in die jeweils andere Richtung ist ein häufiger Schritt in einem Datenworkflow, und das Unangenehme daran ist die Entscheidung, wie verschachteltes JSON zu flachen Spalten wird.

## So funktioniert das Abflachen

Jede nicht leere Zeile wird als JSON geparst. Werte, die Objekte sind, werden zu einer einzigen CSV-Zeile. Bei aktiver Abflachung wird eine verschachtelte Eigenschaft wie `address.city` zu einer Spalte mit genau diesem Punktnamen, und tiefere Verschachtelungen setzen das Muster fort. Arrays werden standardmäßig als JSON-Text geschrieben, wodurch ihre Struktur innerhalb einer Zelle erhalten bleibt. Ein Wert, der selbst ein Objekt ist, wird ohne Abflachung ebenfalls als JSON-Text geschrieben.

Spalten werden über alle behaltenen Datensätze in der Reihenfolge ihres ersten Auftretens entdeckt. Die Kopfzeile verwendet diese Namen. Fehlt ein Schlüssel in einem bestimmten Datensatz, bleibt seine Zelle leer. Deshalb wirken Spalten beim Import in ein Tabellenprogramm manchmal unregelmäßig: Die zugrunde liegenden Daten hatten an dieser Stelle schlicht keinen Wert.

## Quoting und Sicherheit

Der Schreiber folgt RFC 4180. Ein Feld wird in Anführungszeichen gesetzt, wenn es das Trennzeichen, ein doppeltes Anführungszeichen, einen Wagenrücklauf, einen Zeilenumbruch oder führende bzw. abschließende Leerzeichen enthält. Anführungszeichen innerhalb eines Feldes werden verdoppelt. Zeilen enden mit CRLF, wie es Tabellenprogramme erwarten. Ein Semikolon oder Tabulator als Trennzeichen ist nützlich in Regionen, in denen das Komma als Dezimalzeichen dient.

Der Formelschutz ist eine kleine, aber wichtige Funktion. Werte, die mit `=`, `+`, `-`, `@`, Tabulator oder Wagenrücklauf beginnen, können von Tabellenprogrammen als Formeln behandelt werden. Eine gezielt gestaltete Zelle könnte beim Öffnen der Datei eine unbeabsichtigte Aktion auslösen. Ein vorangestelltes Apostroph macht solche Werte zu einfachem Text. Der Schutz ist standardmäßig aus, weil er den Zellwert verändert, aber er ist die richtige Wahl für jede CSV aus nicht vertrauenswürdigen Eingaben.

## So verwendest du es

1. Füge JSON Lines in den Eingabebereich ein oder ziehe eine `.ndjson`- oder `.jsonl`-Datei auf die Seite.
2. Wähle ein Trennzeichen und entscheide über Abflachung, Kopfzeile und Formelschutz.
3. Klicke auf Ausführen, kopiere die CSV oder lade sie als `result.txt` herunter. Benenne die heruntergeladene Datei für dein Tabellenprogramm in `.csv` um.

## Große Eingaben

Zeilen werden aus einem übertragenen Dateipuffer in Blöcken fester Größe gelesen, sodass auch eine sehr große Datei auf dem Hauptthread nie zu einer einzigen riesigen Zeichenkette wird. Während des Laufs wird Fortschritt gemeldet, und der Worker lässt sich abbrechen. Eine Sicherheitsgrenze begrenzt die Anzahl der für die CSV gesammelten Zeilen, denn ein Tabellenprogramm hat selbst ein Zeilenlimit, und eine unbegrenzte Tabelle würde den Sinn des Streamings zunichtemachen. Ist dein Datensatz größer, filtere ihn vor der Konvertierung.

## Datenschutz

Die Konvertierung findet vollständig in deinem Browser statt. Die Website stellt während der Nutzung keine Netzwerkanfragen, nichts wird gespeichert, und die Daten erscheinen nie in einer URL. Das ist hier besonders wichtig, weil JSON-Lines-Exporte häufig Kundendatensätze oder interne Kennungen enthalten.

## Häufige Fehler

Eine Zeile, die gültiges JSON, aber kein Objekt ist, wird als Zeilenfehler gemeldet; verpacke Skalare zuerst in ein Objekt mit einem aussagekräftigen Schlüssel. Ein Syntaxfehler nennt die betroffene Zeilennummer und einen Hinweis. Sieht die Ausgabe wie eine einzige lange Zeile aus, prüfe das Trennzeichen: eine mit Semikolons geschriebene Datei zerfällt nicht in Spalten, wenn sie mit Komma-Einstellungen geöffnet wird.
