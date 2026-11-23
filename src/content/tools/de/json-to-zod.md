---
locale: de
toolId: json-to-zod
title: JSON to Zod
description: "Erzeuge Zod-v4-Schemas aus einem JSON-Beispiel mit optionalen und nullable Feldern, strengen Objekten und einem exportierten TypeScript-Typ."
summary: "Wandle ein JSON-Beispiel in eine Zod-v4-Schemadatei um. Der Generator nutzt denselben Ableitungsbaum wie das TypeScript-Tool, gibt moderne Format-Helfer aus und kann strenge Objekte sowie z.infer-Typexporte ergänzen."
steps:
  - "Füge ein möglichst repräsentatives JSON-Beispiel in den Eingabebereich ein."
  - "Lege einen Schemanamen fest und entscheide, ob Konstante, z.infer-Typ, optionale Felder und strenge Objekte exportiert werden."
  - "Klicke auf Generieren, kopiere oder lade die TypeScript-Datei herunter und importiere sie in dein Projekt."
example:
  caption: "Ein Beispielobjekt und das daraus erzeugte Zod-Schema."
  input: '{ "id": 7, "email": "ada@example.com", "active": true }'
  output: 'import { z } from "zod";\n\nexport const Root = z.object({\n  id: z.number(),\n  email: z.email(),\n  active: z.boolean(),\n});\n\nexport type Root = z.infer<typeof Root>;'
mistakes:
  - "Annehmen, die Ableitung könne Einschränkungen erraten, die sie nicht sieht, etwa Mindestlängen oder erlaubte Zahlenbereiche."
  - "Vergessen, dass ein strenges Objekt unbekannte Schlüssel ablehnt, während ein einfaches z.object sie standardmäßig entfernt."
  - "Verkettete String-Validierer im Zod-3-Stil verwenden, obwohl der erzeugte Code auf die top-level Helfer von Zod 4 abzielt."
faq:
  - q: "Auf welche Zod-Version zielt der erzeugte Code?"
    a: "Auf Zod 4. String-Formate werden als top-level Helfer wie z.email(), z.uuid(), z.url(), z.ipv4(), z.iso.date() und z.iso.datetime() ausgegeben, also in der aktuell dokumentierten Syntax. In Zod 3 waren diese Prüfungen verkettete Methoden auf z.string()."
  - q: "Wie werden optionale und nullable Felder erkannt?"
    a: "Der Generator betrachtet jedes Objekt in einem Array. Ein Schlüssel, der in manchen Elementen fehlt, wird als optional markiert; ein Schlüssel, dessen Wert irgendwo null ist, wird in z.nullable() gehüllt. Diese Prüfungen lassen sich abschalten, wenn du eine strengere Basis willst."
  - q: "Was ändert die Option für strenge Objekte?"
    a: "Sie gibt z.strictObject statt z.object aus. Ein einfaches Zod-Objekt entfernt unbekannte Schlüssel aus dem geparsten Ergebnis, ein strenges meldet sie als Fehler. Wähle streng, wenn unerwartete Felder laut scheitern sollen, etwa an einer API-Grenze."
  - q: "Ist der z.infer-Export notwendig?"
    a: "Nein, aber praktisch. Er liefert einen TypeScript-Typ, der aus dem Laufzeit-Schema abgeleitet ist, sodass Validierung und statische Typisierung synchron bleiben. Du kannst ihn deaktivieren, wenn dein Projekt seine Typen anderswo ableitet."
  - q: "Nutzt dieses Tool dieselbe Ableitung wie JSON to TypeScript?"
    a: "Ja. Beide Tools parsen das Beispiel in denselben typisierten Syntaxbaum. Der Zod-Generator läuft über diesen Baum und gibt Schema-Ausdrücke statt Interface-Deklarationen aus, sodass beide Ausgaben bei Typen, optionalen Feldern und zusammengefassten Array-Elementen übereinstimmen."
  - q: "Werden meine Beispiele hochgeladen oder gespeichert?"
    a: "Nein. Die Generierung läuft in einem Web Worker in deinem Browser. Es gibt keinen Upload, keine Analysen des Eingabewerts, keine dauerhafte Speicherung und keinen Abfrageparameter, der das Beispiel enthält."
---

Zod validiert Daten zur Laufzeit und kann zugleich die statischen Typen liefern, die du beim Kompilieren verwendest. Das passt gut zu Daten, die eine Grenze überqueren: eine API-Antwort, eine Formulareingabe oder eine Konfigurationsdatei. Der mühsame Teil ist das Schreiben der ersten Schemaversion, und das bedeutet meist, ein Beispiel zu lesen und jedes Feld von Hand zu übersetzen. Dieses Tool übernimmt genau diese Übersetzung aus einem Beispiel, das du einfügst.

## So funktioniert die Generierung

Dieses Tool und JSON to TypeScript beginnen mit demselben Parsing-Schritt. Das Dokument wird zu einem typisierten Baum aus Objekten, Arrays, Zeichenketten, Zahlen, Booleschen Werten und null. Der Zod-Generator läuft über diesen Baum und gibt für jeden Knoten einen Ausdruck aus. Objekte werden zu `z.object({ ... })`, Arrays zu `z.array(...)`, und Skalare zu den passenden Zod-Primitiven. Objektgruppen innerhalb eines Arrays werden zusammengeführt: Ihre Schlüssel werden vereint, in manchen Datensätzen fehlende Schlüssel als optional markiert und manchmal null-Werte als nullable. Ein einzelnes Beispiel mit mehreren Datensätzen liefert daher oft ein genaueres Schema als ein einzelner Datensatz.

Zeichenketten werden mit konservativen Mustern auf gängige Formate geprüft. Erkennt eine Gruppe von Strings durchgehend eines, gibt der Generator den Zod-4-Helfer dafür aus: `z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`, `z.iso.date()` oder `z.iso.datetime()`. Das sind die aktuellen top-level APIs aus der Zod-4-Dokumentation; älterer Code nutzte verkettete Methoden auf `z.string()`. Die erzeugte Datei beginnt mit `import { z } from "zod";`, damit du sie direkt in ein TypeScript-Projekt legen kannst.

## So verwendest du es

1. Füge ein JSON-Beispiel mit den Feldern ein, die dir wichtig sind. Nimm mehrere Array-Elemente auf, wenn ein Feld manchmal fehlt.
2. Lege den Schemanamen fest und wähle die Optionen. `export const` eignet sich für ein importierbares Modul; `z.infer` ergänzt einen passenden TypeScript-Typ.
3. Klicke auf Generieren, prüfe den Code und kopiere oder lade ihn herunter. Ergänze Einschränkungen, die das Beispiel nicht verraten kann, etwa Längen, Bereiche oder Beschreibungen.

## Was die Ableitung dir nicht sagen kann

Ein Beispiel zeigt Werte, keine Regeln. Wenn jede Zeichenkette im Beispiel zwölf Zeichen lang ist, gibt es keinen Beleg dafür, dass zwölf eine Vorgabe ist. Ist eine Zahl im Beispiel positiv, gibt der Generator trotzdem `z.number()` aus, weil er nicht wissen kann, ob negative Werte unzulässig sind. Formate sind Heuristiken: Ein Wert, der wie eine E-Mail-Adresse aussieht, ist wahrscheinlich eine, aber das Muster ist bewusst einfach gehalten. Bearbeite das Schema nach der Generierung, um den echten Vertrag festzuhalten, und halte ein paar repräsentative Fixtures bereit, anhand derer sich spätere Änderungen prüfen lassen.

Objekte in Zod entfernen unbekannte Schlüssel standardmäßig. Soll deine Anwendung unerwartete Felder stattdessen ablehnen, aktiviere strenge Objekte. Das erzeugt `z.strictObject`, das unbekannte Eigenschaften meldet statt sie stillschweigend zu verwerfen. Dieser Unterschied ist wichtig, wenn ein Tippfehler in einem eingehenden Payload früh auffallen soll.

## Datenschutz

Das Beispiel wird in einem Web Worker verarbeitet und nie irgendwohin gesendet. Die Seite hat keine Analysen, keine Anfragen an Drittanbieter und eine Content-Security-Policy, die ausgehende Verbindungen verbietet. Nichts, was du einfügst, wird gespeichert, und das Schema erscheint nie in der URL.

## Häufige Fehler

Ein leeres oder ungültiges Dokument lässt sich nicht parsen, und die Fehleranzeige nennt die genaue Zeile und Spalte. Ein primitiver Wert an oberster Ebene erzeugt eine Alias-artige Konstante statt eines Objektschemas. Namen, die keine gültigen JavaScript-Bezeichner sind, fallen auf `Root` zurück; benenne die erzeugte Konstante um, wenn du einen bestimmten Export brauchst.
