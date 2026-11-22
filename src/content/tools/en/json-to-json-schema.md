---
locale: en
toolId: json-to-json-schema
title: JSON to JSON Schema
description: "Infer a JSON Schema from a sample document with detected formats, enums, draft settings, and title options, then validate your JSON against it."
summary: "Turn an example document into a JSON Schema you can edit and reuse. The generator infers types, required keys, item schemas, common string formats, and low-cardinality enums, all inside your browser."
steps:
  - "Paste a representative JSON sample into the input pane."
  - "Choose a draft, enable format or enum detection, and press Generate."
  - "Copy or download the schema, or press Validate with this schema to test it against the same sample."
example:
  caption: "A small sample and the schema inferred from it."
  input: '{ "name": "Ada", "age": 36, "email": "ada@example.com" }'
  output: '{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" }, "email": { "type": "string", "format": "email" } }, "required": ["name", "age", "email"] }'
mistakes:
  - "Inferring from a single sparse example and assuming optional keys will be detected; add samples that cover the missing cases first."
  - "Treating a detected format as a guarantee: JSON Schema annotations describe intent, and validators only enforce them when configured to."
  - "Using a draft-07 validator with a 2020-12 schema without adjusting the $schema URI and keywords."
faq:
  - q: "How does the generator decide which keys are required?"
    a: "For a single object it marks every key in the sample as required. When it merges the objects inside an array, a key is required only when it appears in every element. That matches the common case where a collection of records shares a stable shape with a few optional fields."
  - q: "What happens when the same field has different types?"
    a: "The merged property gets a type array, for example [\"string\", \"null\"]. This is valid JSON Schema and is the usual way to describe a field that is sometimes absent as null."
  - q: "Which string formats are detected?"
    a: "The generator recognises date-time, date, email, URI, UUID, and IPv4 using conservative patterns. A format is an annotation: it documents the expected shape and some validators enforce it, but it never changes the underlying string type."
  - q: "When should I turn on enum detection?"
    a: "Use it for small controlled vocabularies such as roles or statuses. The generator adds an enum only when at least two distinct string values appear and there are at most eight of them, so free-text fields are left alone."
  - q: "Can I validate the generated schema immediately?"
    a: "Yes. The Validate with this schema button passes the schema and your original sample to the JSON Schema Validator in the same tab session. Nothing is uploaded, and the handoff is cleared as soon as the validator reads it."
  - q: "Is the result a complete schema for my API?"
    a: "It is a starting point, not a specification. Inference only sees the values you pasted. Add descriptions, constraints, and examples yourself, and feed it several representative documents before you rely on it in a pipeline."
---

A JSON Schema is a document that describes another document: which properties exist, what types they hold, which ones are required, and which values are allowed. Writing one by hand is slow, and the first draft usually comes from an example anyway. This tool reverses the order. Paste a representative JSON document and it produces a schema you can edit, share, or feed into a validator.

## What the inference covers

The generator walks the parsed document and emits a type for every value. Strings become `string`, whole numbers become `integer`, decimals become `number`, and `true`, `false`, and `null` map to their matching JSON Schema types. Objects get a `properties` map and a `required` list. Arrays get an `items` schema. That last part is where most of the work happens: when an array holds objects, the generator merges them into one shape. The union of their keys becomes the property set, while only keys present in every element stay in `required`. A field that appears as a string in one record and null in another becomes a type array, so no information is silently discarded.

Optionally, the generator can add a `format` annotation for strings that look like a date-time, date, email address, URI, UUID, or IPv4 address. It can also add `enum` values for small string vocabularies, but only when there are between two and eight distinct values. You can choose between draft 2020-12 and draft-07, set `additionalProperties: false`, and include a `$schema` URI and title.

## How to use it

1. Paste a JSON sample that is as representative as you can make it. Several records in an array are more useful than one.
2. Pick a draft and the options you want, then press Generate. The work runs in a Web Worker, so a large sample does not freeze the page.
3. Review the schema, copy or download it, or press Validate with this schema to check the original sample against it.

## Reading the result

A generated schema is a description of what was observed, not a contract someone signed. If your sample has five users and none of them has a `phone` field, the schema cannot know that `phone` is allowed. Conversely, a format annotation does not prove that every real value follows that format; it records that the sample values did. Treat the output as a first draft and add the constraints your application actually needs: minimum lengths, numeric bounds, patterns, descriptions, and examples.

Draft choice matters when you move the schema into another tool. Draft 2020-12 uses `https://json-schema.org/draft/2020-12/schema` as its `$schema` URI, while draft-07 uses the older `http://json-schema.org/draft-07/schema#`. Most validators detect the dialect from that URI, so keep the option consistent with the validator you plan to use.

## Privacy

The sample never leaves your browser. Inference runs in a Web Worker, the tool makes no network requests, and the document is not saved to local or session storage. The button that sends the schema to the validator uses a one-shot handoff in the current tab and clears it immediately after reading.

## Common errors

An empty or invalid document cannot be inferred, and the error panel points to the exact line and column. A top-level array is handled, but if it contains no objects there is no field set to merge, so `items` becomes an empty schema. Enum detection is deliberately conservative; if you want a fixed value set for a field with only one observed value, add the enum by hand.
