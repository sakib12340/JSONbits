---
locale: de
toolId: ndjson-validator
title: JSON Lines Validator
description: "Validiere JSON-Lines-Dateien Zeile für Zeile mit genauen Zeilennummern, Leerzeilen-Zählung und einer begrenzten Fehlerliste zum direkten Springen."
summary: "Prüfe jede Zeile einer JSON-Lines- oder NDJSON-Datei einzeln. Der Validator meldet exakte Zeilennummern, trennt Leerzeilen von ungültigen und lässt dich direkt zum ersten fehlerhaften Datensatz springen."
steps:
  - "Füge deine JSON-Lines-Daten ein oder ziehe eine .ndjson- bzw. .jsonl-Datei auf die Seite."
  - "Entscheide, ob beim ersten Fehler gestoppt werden soll, und klicke dann auf Validieren."
  - "Lies die Zusammenfassung und die Fehlerliste; klicke auf einen Fehler, um in der Eingabe zu dieser Zeile zu springen."
example:
  caption: "Eine gültige Zeile, gefolgt von einer ungültigen."
  input: '{"id":1,"name":"Ada"}\n{"id":2,"name":}'
  output: 'Lines 2 · Valid 1 · Invalid 1 · Blank 0\nL2:17 Expected a value'
mistakes:
  - "Die ganze Datei als ein JSON-Dokument behandeln; JSON Lines validiert jede Zeile für sich."
  - "Vergessen, dass ein abschließender Zeilenumbruch normal ist und keinen zusätzlichen Datensatz erzeugt."
  - "Annehmen, der erste Fehler sei der einzige; schalte Stopp beim ersten Fehler aus, um eine begrenzte Gesamtschau zu sehen."
faq:
  - q: "Was ist eine JSON-Lines-Datei?"
    a: "Es ist eine Textdatei, in der jede Zeile ein vollständiger, unabhängiger JSON-Wert ist. Es gibt kein umschließendes Array und keine Kommas zwischen Datensätzen. Dadurch lässt sich ein neuer Datensatz anhängen, ohne die Datei neu zu schreiben, und Leser können sie Zeile für Zeile verarbeiten."
  - q: "Wie unterscheidet sich die Prüfung von einem normalen JSON-Validator?"
    a: "Ein normaler Validator parst ein Dokument. Hier ist jede Zeile ein eigenes Dokument, daher meldet das Tool für jedes Problem eine Zeilennummer und zählt gültige, ungültige und leere Zeilen getrennt. Ein einzelner defekter Datensatz macht den Rest der Datei nicht unbrauchbar."
  - q: "Warum ist die Fehlerliste begrenzt?"
    a: "Eine große defekte Datei kann Tausende Fehler enthalten. Alle darzustellen würde die Seite einfrieren, daher behält das Tool die ersten eintausend und meldet die tatsächliche Gesamtzahl. Die Liste ist virtualisiert, das heißt, es existieren nur die gerade sichtbaren Zeilen im Dokument."
  - q: "Lädt das Tool meine Datei hoch?"
    a: "Nein. Die Datei wird in deinem Browser gelesen und in Blöcken an einen Web Worker übertragen. Es gibt keine Netzwerkanfragen, nichts wird gespeichert, und der Inhalt erscheint nie in der URL."
  - q: "Was bewirkt Stopp beim ersten Fehler?"
    a: "Die Prüfung endet, sobald eine schlechte Zeile gefunden ist. Das ist nützlich, wenn du eine Datei Problem für Problem behebst und nicht auf einen vollständigen Durchlauf einer sehr großen Eingabe warten willst."
---

JSON Lines, auch NDJSON genannt, speichert einen JSON-Wert pro Zeile. Das Format ist bewusst schlank: kein umschließendes Array, keine Kommas und keine gemeinsamen Einrückungsregeln. Diese Einfachheit macht es zur beliebten Wahl für Protokolle, Ereignisströme und große Datensätze, denn ein Produzent kann eine Zeile anhängen und ein Konsument kann eine Zeile lesen, ohne die ganze Datei zu laden. Der Preis dafür ist, dass eine einzelne fehlerhafte Zeile keinen einzigen Fehler auf Dateiebene erzeugt, wie es bei einem normalen JSON-Dokument der Fall wäre. Jede Zeile muss für sich geprüft werden.

## Was dieser Validator meldet

Das Tool liest die Eingabe in Blöcken fester Größe und trennt dabei die Zeilen, damit eine hundert Megabyte große Datei nicht zu einer einzigen riesigen JavaScript-Zeichenkette wird. Jede Zeile wird unabhängig geparst. Leerzeilen werden getrennt von echten Datensätzen gezählt, weil ein abschließender Zeilenumbruch normal und eine leere Zeile in der Mitte meist harmlos ist. Gültige und ungültige Anzahlen werden zusammen mit der Gesamtzahl der Zeilen ausgegeben.

Scheitert das Parsen einer Zeile, hält das Tool Zeilennummer, Spalte des Problems, Meldung und einen verständlichen Hinweis fest. Die ersten eintausend Fehler werden behalten, daneben steht die tatsächliche Gesamtzahl. Die Liste ist virtualisiert: Es werden nur die gerade sichtbaren Zeilen erzeugt, sodass das Scrollen durch eine lange Fehlerliste flüssig bleibt. Ein Klick auf eine Zeile setzt den Cursor im Editor an die entsprechende Stelle.

## So verwendest du es

1. Füge JSON Lines in den Eingabebereich ein oder ziehe eine `.ndjson`- oder `.jsonl`-Datei irgendwohin auf die Seite.
2. Entscheide, ob beim ersten Fehler gestoppt werden soll. Lass die Option aus, um eine begrenzte Auswahl aller Probleme zu sehen.
3. Klicke auf Validieren, lies die Zusammenfassung und klicke auf einen Fehler, um zur beanstandeten Zeile zu springen.

## Die Ergebnisse lesen

Eine hohe Zahl ungültiger Zeilen bei insgesamt wenigen Zeilen bedeutet meist, dass die Datei eigentlich ein hübsch gedrucktes JSON-Array ist und keine JSON-Lines-Daten. Dieses Format gehört in den JSON Formatter; konvertiere es zuerst zu NDJSON. Eine hohe Zahl leerer Zeilen stammt oft aus einem Export, der Trennzeichen zwischen Datensätzen einfügt. Aktiviere beim Konvertieren das Entfernen, wenn diese Zeilen verschwinden sollen.

Spaltennummern beziehen sich auf die jeweilige Zeile, nicht auf die gesamte Datei. Das entspricht der Art, wie Editoren den Cursor anzeigen, und macht den Fehler direkt nutzbar: Die Spalte verrät, an welcher Stelle im Datensatz der Parser aufgegeben hat. Der Hinweis erklärt die wahrscheinliche Ursache in Alltagssprache, etwa eine nicht geschlossene Zeichenkette oder ein fehlendes Komma.

## Große Dateien

Dateien oberhalb der Vorschaugrenze werden nicht in den Editor gezeichnet. Stattdessen zeigt die Seite Dateiname und Größe an und wartet auf einen ausdrücklichen Start. Der Worker meldet während der Prüfung den Fortschritt, und Abbrechen beendet den Auftrag. Speichermangel wird mit einer freundlichen Meldung statt eines abgestürzten Tabs gemeldet. So bleibt der Hauptthread reaktionsfähig, selbst wenn die Eingabe weit über dem liegt, was ein Browser komfortabel bearbeiten kann.

## Datenschutz

Eine JSON-Lines-Datei kann personenbezogene Daten, Tokens oder Kundendatensätze enthalten. Die Datei wird lokal gelesen, in einem Web Worker verarbeitet und nie hochgeladen. Die Website hat keine Analysen und eine Content-Security-Policy, die ausgehende Verbindungen verbietet. Nichts, was du einfügst oder ablegst, wird im lokalen oder Sitzungsspeicher abgelegt.

## Häufige Fehler

Eine Zeile mit einer einzelnen Zahl oder Zeichenkette ist gültiges JSON und wird als gültig gezählt, auch wenn viele Pipelines Objekte erwarten. Braucht dein nachgelagertes Tool Objekte, konvertiere mit JSON Lines to CSV und prüfe die Meldungen „muss ein Objekt sein". Eine als UTF-16 gespeicherte Datei wird mit einem Hinweis zur Kodierung abgelehnt; speichere sie zuerst als UTF-8.
