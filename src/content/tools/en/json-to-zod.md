---
locale: en
toolId: json-to-zod
title: JSON to Zod
description: "Generate Zod v4 schemas from a JSON sample with optional and nullable fields, strict objects, and an inferred TypeScript type export you can use."
summary: "Convert a JSON example into a Zod v4 schema file. The generator reuses the same inference tree as the TypeScript tool, emits modern format helpers, and can add strict objects and z.infer type exports."
steps:
  - "Paste a representative JSON sample into the input pane."
  - "Set a schema name and choose whether to export the constant, the z.infer type, optional fields, and strict objects."
  - "Press Generate, then copy or download the TypeScript file and import it into your project."
example:
  caption: "A sample object and the Zod schema generated from it."
  input: '{ "id": 7, "email": "ada@example.com", "active": true }'
  output: 'import { z } from "zod";\n\nexport const Root = z.object({\n  id: z.number(),\n  email: z.email(),\n  active: z.boolean(),\n});\n\nexport type Root = z.infer<typeof Root>;'
mistakes:
  - "Assuming inference can recover constraints it cannot see, such as minimum lengths or allowed numeric ranges."
  - "Forgetting that a strict object rejects unknown keys while a plain z.object strips them by default."
  - "Using Zod 3 style chained string validators when the emitted code targets Zod 4 top-level helpers."
faq:
  - q: "Which version of Zod does the generated code target?"
    a: "It targets Zod 4. String formats are emitted as top-level helpers such as z.email(), z.uuid(), z.url(), z.ipv4(), z.iso.date(), and z.iso.datetime(), which is the current documented syntax. In Zod 3 these checks were chained methods on z.string()."
  - q: "How are optional and nullable fields detected?"
    a: "The generator looks at every object in an array. A key missing from some elements is marked optional, and a key whose value is null somewhere is wrapped in z.nullable(). These checks can be turned off if you want a stricter baseline."
  - q: "What does the strict objects option change?"
    a: "It emits z.strictObject instead of z.object. A plain Zod object strips unknown keys from the parsed result; a strict object reports them as an error. Choose strict when unexpected fields should fail loudly, for example at an API boundary."
  - q: "Is the z.infer export necessary?"
    a: "No, but it is convenient. It gives you a TypeScript type derived from the runtime schema, so validation and static typing stay in sync. You can disable it if your project derives types elsewhere."
  - q: "Does this tool reuse the JSON to TypeScript inference?"
    a: "Yes. Both tools parse the sample into the same typed syntax tree. The Zod generator walks that tree and emits schema expressions rather than interface declarations, so the two outputs agree about types, optional fields, and merged array items."
  - q: "Are my samples uploaded or stored?"
    a: "No. Generation runs in a Web Worker in your browser. There is no upload, no analytics on the input, no persistent storage, and no query parameter containing the sample."
---

Zod validates data at runtime and can also provide the static types you use at compile time. That makes it a good fit for data crossing a boundary: an API response, a form submission, or a configuration file. The tedious part is writing the first version of the schema, which usually means reading an example and translating each field by hand. This tool does that translation from a sample you paste.

## How generation works

Both this tool and JSON to TypeScript start from the same parsing step. The document becomes a typed tree of objects, arrays, strings, numbers, booleans, and nulls. The Zod generator walks that tree and emits an expression for each node. Objects become `z.object({ ... })`, arrays become `z.array(...)`, and scalars become the matching Zod primitives. Groups of objects inside an array are merged: their keys are unioned, keys missing from some records are marked optional, and values that are sometimes null become nullable. That means a single sample containing a few records often produces a more accurate schema than one record alone.

String values are checked against conservative patterns for common formats. When a group of strings consistently matches one, the generator emits the Zod 4 helper for it: `z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`, `z.iso.date()`, or `z.iso.datetime()`. These are the current top-level APIs documented for Zod 4; older code used chained methods on `z.string()`. The emitted file starts with `import { z } from "zod";` so it can be dropped into a TypeScript project.

## How to use it

1. Paste a JSON sample with the fields you care about. Include several array items if any field is sometimes missing.
2. Set the schema name and choose the options. `export const` is useful for an importable module; `z.infer` adds a matching TypeScript type.
3. Press Generate, review the code, then copy or download it. Add constraints the sample cannot reveal, such as lengths, ranges, or descriptions.

## What inference cannot tell you

A sample shows values, not rules. If every string in the example is twelve characters long, there is no evidence that twelve is a requirement. If a number is positive in the sample, the generator will still emit `z.number()` because it cannot know whether negative values are illegal. Formats are heuristics: a value that looks like an email address probably is one, but the pattern is deliberately simple. After generating, edit the schema to encode the real contract, and keep a few representative fixtures so future changes can be checked against it.

Objects in Zod strip unknown keys by default. If your application should reject unexpected fields instead, enable strict objects. This emits `z.strictObject`, which reports unknown properties rather than quietly dropping them. That distinction matters when a typo in an incoming payload should be caught early.

## Privacy

The sample is processed inside a Web Worker and never sent anywhere. The page has no analytics, no third-party requests, and a content security policy that forbids outbound connections. Nothing you paste is written to storage, and the schema never appears in the URL.

## Common errors

An empty or invalid document cannot be parsed, and the error panel shows the precise line and column. A top-level primitive produces an alias-style constant instead of an object schema. Names that are not valid JavaScript identifiers fall back to `Root`, so rename the generated constant if you need a specific export.
