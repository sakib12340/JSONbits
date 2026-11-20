---
locale: en
category: generate
description: 'Generate TypeScript types from a JSON sample in your browser. Review optional fields, unions, and quoted keys. Nothing is uploaded or stored.'
faq:
  - q: Which generators are available?
    a: One for now, JSON to TypeScript, which turns a JSON sample into exported interfaces and type aliases. The category will grow as more generate tools ship.
  - q: Are generated types a substitute for validation?
    a: No. Types describe the sample they were generated from and disappear at runtime. Validation with JSON Schema checks the actual data.
  - q: Can I use a real API response as the sample?
    a: Yes, and that is the usual case. A response with one complete record and one partial record produces a more accurate type than repeated identical items.
  - q: Does the generator send my data anywhere?
    a: No. Generation runs in a Web Worker in this browser tab, and the resulting .ts file is built locally. Nothing is uploaded or stored.
---

Generators turn a sample into a definition that a compiler or a schema validator can use. The value is speed and accuracy: an API response already contains the shape of the data, so writing a type by hand means transcribing keys, guessing nullability, and remembering which fields were absent in half the records. A generator reads the sample and produces the definition, and you review it.

This category currently holds one tool, [JSON to TypeScript](/json-to-typescript). Paste a JSON sample and it emits an `export interface` for a root object, or an `export type` for a root array or primitive. Numbers, strings, booleans, and null map to their TypeScript counterparts, arrays of objects are merged into one interface, and a property missing from any item becomes optional. Empty arrays become `unknown[]`, incompatible item types become a union, and property names that are not valid identifiers are quoted. A root name option sets the exported name, and readonly properties marks each field immutable.

The merge rule is the part worth understanding. Ten identical array items teach the generator nothing about optionality; one item without a field teaches it that the field can be absent. When a response contains a field that is sometimes null, the generated type says null, which is correct for the sample and often too narrow for production. Treat the output as a first draft and widen it where the contract allows more. The type is also a snapshot: commit it and diff it when the API changes, so a new field arrives as a reviewable line instead of a surprise at runtime.

Generated types also do not check anything at runtime. An interface disappears when TypeScript compiles, so a payload that violates it still arrives at your code. Pair the generated type with [JSON Schema Validator](/json-schema-validator) when you need a real check, and use [JSON Validator](/json-validator) to confirm the sample is valid JSON before generating from it.

The panel is a good place to start when wiring a new endpoint: paste one response, generate the type, review the optional fields, then replace `unknown[]` with the element type you actually expect. Everything runs in a Web Worker in this tab. The sample is not uploaded, not logged, and not written to storage, and the download is assembled locally as a `.ts` file.

If the sample fails to parse, the error points at the line and column. Fix it with [JSON Repair](/json-repair) or reformat it with [JSON Formatter](/json-formatter) before generating, so a syntax mistake is never mistaken for a structural one.
