---
locale: en
toolId: jwt-decoder
title: JWT Decoder
description: "Decode JWT headers and payloads locally, read claims and expiry times in readable form, and see why the signature is never verified by this tool."
summary: "A JWT decoder splits a JSON Web Token into its header and payload, base64url-decodes the two segments, and shows the claims in readable form. Everything happens in your browser: the token is never uploaded, stored, or added to the URL."
steps:
  - "Paste a JWT into the input pane. A leading 'Bearer ' prefix and line breaks are both accepted."
  - "Press Decode. The worker splits the token, base64url-decodes the header and payload, and parses both JSON objects."
  - "Read the claims table for expiry, issuer, subject, and algorithm, and use Copy or Download for the decoded JSON."
example:
  caption: "A decoded token with an expiration time, an issuer, and a subject."
  input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiYWRhIiwiZXhwIjoxODkzNDU2MDAwfQ.signature"
  output: "{\n  \"header\": { \"alg\": \"HS256\", \"typ\": \"JWT\" },\n  \"payload\": {\n    \"iss\": \"https://example.com\",\n    \"sub\": \"ada\",\n    \"exp\": 1893456000\n  }\n}"
mistakes:
  - "Treating a decoded token as proof of identity: decoding only reads the segments, it does not check the signature."
  - "Pasting a five-part encrypted token (JWE); those cannot be decoded without a decryption key."
  - "Assuming the exp claim is always present; tokens may omit it or use a different claim for lifetime."
faq:
  - q: "Does this tool verify the JWT signature?"
    a: "No. Decoding reads the base64url-encoded header and payload and parses the JSON inside them. Verifying a signature requires the issuer's key and a cryptographic check, and this tool deliberately does neither. It will warn you when the header says alg is none or when the signature segment is missing."
  - q: "Is my token uploaded or stored anywhere?"
    a: "No. The token is decoded inside a Web Worker in your browser. The page makes no network requests while you use the tool, the token is not written to localStorage or IndexedDB, and it is never placed in the address bar. Closing the tab discards it."
  - q: "Why do I see a warning that the token has expired?"
    a: "If the payload contains a numeric exp claim, the decoder compares it with the current time. The value is seconds since the Unix epoch, not milliseconds. The claims table shows the same instant in UTC and in your local time zone so you can judge it yourself."
  - q: "What is the difference between a JWT and a JWE?"
    a: "A signed JWT, more precisely a JWS, has three dot-separated parts: header, payload, and signature. Its payload only needs base64url decoding to be readable. A JWE is encrypted and has five parts; its payload cannot be read without the decryption key, so this decoder refuses it rather than showing nonsense."
  - q: "Can I paste a token that starts with Bearer?"
    a: "Yes. The decoder removes a leading Bearer prefix, ignores case, and strips whitespace and line breaks. That makes tokens copied from an Authorization header or a wrapped log line usable without manual cleanup."
  - q: "Are alg, typ, and kid header claims or payload claims?"
    a: "They are header claims. The header describes how the token is encoded and which key signed it. Claims such as iss, sub, aud, exp, iat, and nbf live in the payload. The claims table groups them so you can tell the two sets apart at a glance."
---

A JSON Web Token is three strings separated by dots: a header, a payload, and a signature. The first two are JSON objects encoded with base64url, which is a base64 alphabet that is safe to place in a URL. Decoding means reversing that encoding and reading the JSON. It is a display operation, not a security check, and keeping those two ideas separate is the main reason to use a dedicated decoder.

## What the decoder shows

The tool splits the token, decodes the header and payload, and parses both objects. The claims table then surfaces the fields people look for most often. Numeric time claims such as `exp`, `iat`, and `nbf` are shown as seconds since the Unix epoch together with a UTC timestamp, a local timestamp, and a relative phrase such as "expires in 2 hours" or "expired 3 days ago". An expired token is marked in the warning area. Text claims such as `iss`, `sub`, and `aud` appear next to header claims such as `alg`, `typ`, and `kid`, so you can see which object each value came from. The full decoded header and payload are also available as formatted JSON that you can copy or download.

## How to use it

1. Paste the token into the input pane. A leading `Bearer ` prefix is fine, as are line breaks introduced by a log viewer or email client.
2. Press Decode. The work runs in a Web Worker, so even a pasted token surrounded by other text does not make the page stutter.
3. Read the claims and the warnings, then copy or download the decoded JSON if you need to keep working with it.

## Why the signature is not verified

Verifying a token means checking that its signature was produced by a key you trust. That requires knowing the issuer, fetching or already holding the right public key, choosing an accepted algorithm, and comparing the result in constant time. A decoder has none of that context. It can only show what the token says about itself. A token whose header claims `alg` is `none`, or whose signature segment is empty, is still perfectly decodable and is exactly the kind of token an attacker would hand you. That is why the warning stays visible above the tool rather than appearing only after something goes wrong.

If you need a trust decision, do it in the service that owns the secret or public key. Use the decoded values as a starting point for debugging: confirm that the issuer and audience are the ones you expect, check that the expiry is sensible, and then let the verifier make the decision.

## Encrypted tokens are different

A five-part token is a JWE, not a signed JWT. Its payload is encrypted, so base64url decoding it produces bytes that are not JSON. This tool reports that case clearly instead of showing replacement characters or a parse error. Handling a JWE requires the recipient's private key and a JOSE library configured with the expected algorithms.

## Privacy

Tokens are credentials. Anyone who reads one may be able to act as the user it represents. This decoder runs entirely in your browser: there is no upload, no analytics on the input, no persistent storage, and no query parameter containing the token. The page's content security policy forbids outbound connections, which makes that claim checkable rather than a promise. Treat the decoded JSON you download with the same care as the original token, and clear your clipboard when you are done.

## Common errors

A token with only two parts is usually a JWS with an empty signature; it is decoded with a missing-signature warning. A token with four or more parts other than the five-part JWE case is malformed. A segment that fails base64url decoding, or that decodes to bytes that are not UTF-8 JSON, is reported with a plain-English hint rather than a stack trace.
