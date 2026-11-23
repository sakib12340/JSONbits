---
locale: de
toolId: jwt-decoder
title: JWT Decoder
description: "Dekodiere JWT-Header und -Payload lokal, lies Claims und Ablaufzeiten verständlich und erfahre, warum die Signatur von diesem Tool nie geprüft wird."
summary: "Ein JWT-Decoder zerlegt ein JSON Web Token in Header und Payload, dekodiert beide Segmente mit base64url und zeigt die Claims lesbar an – vollständig in deinem Browser, ohne Upload oder Speicherung."
steps:
  - "Füge ein JWT in den Eingabebereich ein. Ein vorangestelltes Bearer-Präfix und Zeilenumbrüche werden beide akzeptiert."
  - "Klicke auf Dekodieren. Der Worker zerlegt das Token, dekodiert Header und Payload mit base64url und parst beide JSON-Objekte."
  - "Lies die Claim-Tabelle zu Ablauf, Aussteller, Subjekt und Algorithmus und nutze Kopieren oder Herunterladen für das dekodierte JSON."
example:
  caption: "Ein dekodiertes Token mit Ablaufzeit, Aussteller und Subjekt."
  input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiYWRhIiwiZXhwIjoxODkzNDU2MDAwfQ.signature"
  output: "{\n  \"header\": { \"alg\": \"HS256\", \"typ\": \"JWT\" },\n  \"payload\": {\n    \"iss\": \"https://example.com\",\n    \"sub\": \"ada\",\n    \"exp\": 1893456000\n  }\n}"
mistakes:
  - "Ein dekodiertes Token als Identitätsnachweis behandeln: Dekodieren liest nur die Segmente, es prüft die Signatur nicht."
  - "Ein fünfteiliges verschlüsseltes Token (JWE) einfügen; dieses lässt sich ohne Entschlüsselungsschlüssel nicht dekodieren."
  - "Davon ausgehen, dass der exp-Claim immer vorhanden ist; Tokens können ihn weglassen oder einen anderen Claim für die Lebensdauer nutzen."
faq:
  - q: "Prüft dieses Tool die JWT-Signatur?"
    a: "Nein. Dekodieren liest die base64url-kodierten Segmente Header und Payload und parst das enthaltene JSON. Eine Signaturprüfung braucht den Schlüssel des Ausstellers und eine kryptografische Kontrolle; dieses Tool tut bewusst keines von beidem. Es warnt dich, wenn der Header alg: none angibt oder das Signatursegment fehlt."
  - q: "Wird mein Token irgendwo hochgeladen oder gespeichert?"
    a: "Nein. Das Token wird in einem Web Worker in deinem Browser dekodiert. Die Seite stellt während der Nutzung keine Netzwerkanfrage, das Token landet weder in localStorage noch in IndexedDB und nie in der Adresszeile. Beim Schließen des Tabs ist es verschwunden."
  - q: "Warum erhalte ich eine Warnung, dass das Token abgelaufen ist?"
    a: "Enthält der Payload einen numerischen exp-Claim, vergleicht der Decoder ihn mit der aktuellen Zeit. Der Wert sind Sekunden seit der Unix-Epoche, nicht Millisekunden. Die Claim-Tabelle zeigt denselben Zeitpunkt in UTC und in deiner lokalen Zeitzone, damit du ihn selbst beurteilen kannst."
  - q: "Was ist der Unterschied zwischen einem JWT und einem JWE?"
    a: "Ein signiertes JWT, genauer ein JWS, hat drei durch Punkte getrennte Teile: Header, Payload und Signatur. Sein Payload muss nur per base64url dekodiert werden, um lesbar zu sein. Ein JWE ist verschlüsselt und hat fünf Teile; ohne Entschlüsselungsschlüssel ist sein Payload nicht lesbar, weshalb dieser Decoder ihn ablehnt statt Unsinn anzuzeigen."
  - q: "Kann ich ein Token einfügen, das mit Bearer beginnt?"
    a: "Ja. Der Decoder entfernt ein vorangestelltes Bearer-Präfix, ignoriert die Groß- und Kleinschreibung und entfernt Leerzeichen sowie Zeilenumbrüche. Dadurch lassen sich Tokens aus einem Authorization-Header oder einer umgebrochenen Protokollzeile ohne manuelle Bereinigung verwenden."
  - q: "Sind alg, typ und kid Header- oder Payload-Claims?"
    a: "Es sind Header-Claims. Der Header beschreibt, wie das Token kodiert ist und welcher Schlüssel es signiert hat. Claims wie iss, sub, aud, exp, iat und nbf liegen im Payload. Die Claim-Tabelle gruppiert beide Sätze, damit du auf einen Blick erkennst, woher ein Wert stammt."
---

Ein JSON Web Token besteht aus drei durch Punkte getrennten Zeichenketten: einem Header, einem Payload und einer Signatur. Die ersten beiden sind JSON-Objekte, die mit base64url kodiert sind, einem Base64-Alphabet, das sich sicher in einer URL verwenden lässt. Dekodieren bedeutet, diese Kodierung rückgängig zu machen und das JSON zu lesen. Es ist eine Anzeigeoperation, keine Sicherheitsprüfung – diese beiden Dinge auseinanderzuhalten ist der wichtigste Grund für einen dedizierten Decoder.

## Was der Decoder anzeigt

Das Tool zerlegt das Token, dekodiert Header und Payload und parst beide Objekte. Die Claim-Tabelle hebt dann die Felder hervor, nach denen am häufigsten gesucht wird. Numerische Zeit-Claims wie `exp`, `iat` und `nbf` erscheinen als Sekunden seit der Unix-Epoche zusammen mit einem UTC-Zeitstempel, einem lokalen Zeitstempel und einer relativen Formulierung wie „läuft in 2 Stunden ab" oder „vor 3 Tagen abgelaufen". Ein abgelaufenes Token wird im Warnbereich markiert. Text-Claims wie `iss`, `sub` und `aud` stehen neben Header-Claims wie `alg`, `typ` und `kid`, damit du erkennst, aus welchem Objekt ein Wert stammt. Der vollständige dekodierte Header und Payload sind außerdem als formatiertes JSON verfügbar, das du kopieren oder herunterladen kannst.

## So verwendest du es

1. Füge das Token in den Eingabebereich ein. Ein vorangestelltes `Bearer `-Präfix ist genauso erlaubt wie Zeilenumbrüche durch einen Protokollbetrachter oder ein E-Mail-Programm.
2. Klicke auf Dekodieren. Die Arbeit läuft in einem Web Worker, sodass selbst ein Token mitten in anderem Text die Seite nicht ruckeln lässt.
3. Lies die Claims und die Warnungen und kopiere oder lade das dekodierte JSON herunter, falls du damit weiterarbeiten willst.

## Warum die Signatur nicht geprüft wird

Ein Token prüfen bedeutet festzustellen, ob seine Signatur von einem Schlüssel stammt, dem du vertraust. Dafür musst du den Aussteller kennen, den passenden öffentlichen Schlüssel besitzen oder abrufen, einen zulässigen Algorithmus festlegen und das Ergebnis in konstanter Zeit vergleichen. Ein Decoder hat keinen dieser Kontext. Er kann nur zeigen, was das Token über sich selbst aussagt. Ein Token, dessen Header `alg` als `none` angibt oder dessen Signatursegment leer ist, lässt sich völlig normal dekodieren – und genau ein solches Token würde dir ein Angreifer unterjubeln. Deshalb bleibt die Warnung dauerhaft über dem Tool sichtbar, statt erst nach einem Fehler aufzutauchen.

Wenn du eine Vertrauensentscheidung brauchst, triff sie in dem Dienst, der das Geheimnis oder den öffentlichen Schlüssel besitzt. Nutze die dekodierten Werte als Einstieg für die Fehlersuche: Bestätige, dass Aussteller und Zielgruppe die erwarteten sind, prüfe, ob die Ablaufzeit sinnvoll ist, und überlass die eigentliche Entscheidung dem Verifizierer.

## Verschlüsselte Tokens sind anders

Ein fünfteiliges Token ist ein JWE, kein signiertes JWT. Sein Payload ist verschlüsselt, weshalb die base64url-Dekodierung Bytes liefert, die kein JSON sind. Das Tool meldet diesen Fall klar, statt Ersatzzeichen oder einen Parsefehler anzuzeigen. Einen JWE zu verarbeiten erfordert den privaten Schlüssel des Empfängers und eine JOSE-Bibliothek, die mit den erwarteten Algorithmen konfiguriert ist.

## Datenschutz

Tokens sind Zugangsdaten. Wer ein Token lesen kann, kann möglicherweise im Namen der repräsentierten Person handeln. Dieser Decoder läuft vollständig in deinem Browser: Es gibt keinen Upload, keine Analysen des Eingabewerts, keine dauerhafte Speicherung und keinen Abfrageparameter, der das Token enthält. Die Content-Security-Policy der Seite verbietet ausgehende Verbindungen, was diese Aussage überprüfbar statt bloß versprochen macht. Behandle das heruntergeladene JSON mit derselben Sorgfalt wie das ursprüngliche Token und leere die Zwischenablage, wenn du fertig bist.

## Häufige Fehler

Ein Token mit nur zwei Teilen ist meist ein JWS mit leerer Signatur; es wird mit einer Warnung zur fehlenden Signatur dekodiert. Ein Token mit vier oder mehr Teilen, abgesehen vom fünfteiligen JWE-Fall, ist fehlerhaft. Ein Segment, dessen base64url-Dekodierung scheitert oder das keine UTF-8-JSON-Bytes ergibt, wird mit einem verständlichen Hinweis statt eines Stacktraces gemeldet. Achte außerdem darauf, dass ein gültiges Aussehen nichts über die Echtheit aussagt – genau dafür ist die Signaturprüfung zuständig, die dieses Tool bewusst nicht übernimmt.
