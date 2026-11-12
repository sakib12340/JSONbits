---
locale: en
slug: json-number-precision
title: Why JSON loses big numbers
description: Why 9007199254740993 turns into 9007199254740992, which tools are safe, and how to keep 64-bit identifiers and decimals exact in JSON. Nothing to install.
updated: 2026-11-11
toolIds:
  - json-formatter
  - json-minifier
  - json-validator
faq:
  - q: What is the safe integer limit in JSON?
    a: JavaScript numbers can represent integers exactly up to 2^53 − 1, which is 9007199254740991. Above that, two different integers can map to the same double.
  - q: Does JSON itself limit number size?
    a: 'No. The JSON grammar allows any number token. The limit comes from the parser: most implementations store numbers as IEEE 754 doubles.'
  - q: How should I send a 64-bit ID?
    a: As a string. A database ID, a snowflake, or a tracking number should be quoted so no parser rounds it, and the receiving code should treat it as an opaque identifier.
---

A JSON document can contain any number, but most parsers cannot store every one of them. The gap between what the syntax allows and what a JavaScript number can hold is the source of a bug that shows up in production as an off-by-one identifier.

## The 2^53 limit

JavaScript numbers are IEEE 754 double-precision floats. They represent integers exactly up to 2^53 − 1, or 9007199254740991. One step further:

```js
JSON.parse('{"id": 9007199254740993}').id
// 9007199254740992
```

The literal is valid JSON. The parser stores it as a double, and the nearest representable value is one less. Nothing warns you; the value simply changes.

## Where it bites

The classic case is a database identifier. PostgreSQL `bigint`, Twitter snowflakes, Stripe-style object IDs stored as numbers, and hardware serial numbers all exceed the safe range. A formatter that parses and re-serialises a document will round them, and the corruption survives every later step.

Decimals have the same problem in a different shape. `0.1 + 0.2` is not `0.3` in binary floating point, and a value like `4.999999999999999` may print differently after a round trip.

## What safe tools do differently

A token-based formatter never turns the document into JavaScript numbers. It scans the text, copies number tokens exactly as written, and only changes whitespace. That is why the JSON Formatter and JSON Minifier on this site preserve `9007199254740993` and long decimals: they never parse numbers into doubles.

A validator has an easier job—it only needs to decide whether the syntax is correct—but it must also avoid re-serialising the document to report counts.

## Fixing it in your own code

If a field is an identifier rather than a quantity, send it as a string:

```json
{ "id": "9007199254740993" }
```

This is the only approach that survives every parser, every language, and every proxy in between. `JSON.parse` revivers can restore a `BigInt` when both sides agree, but they do not help with data you do not control.

For decimals that represent money, send a string or an integer number of minor units. Floating point is fine for measurements and display; it is the wrong tool for accounting.

## Checking a document

Validate the syntax first, then format or minify with a token-based tool and compare the digits before and after. If they differ, the tool round-tripped through a double and silently changed your data.

Every tool on this site runs in your browser, so checking a production payload does not require uploading it anywhere.
