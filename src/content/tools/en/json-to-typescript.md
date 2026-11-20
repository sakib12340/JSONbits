---
locale: en
toolId: json-to-typescript
title: JSON to TypeScript
description: 'Generate TypeScript interfaces from a JSON sample, with properties merged from arrays and quoted key names. Runs in your browser, nothing uploaded.'
summary: Turn a JSON sample into exported TypeScript types, with array items merged, missing properties marked optional, and precise numeric types.
steps:
  - Paste a JSON sample or drop a file. Use a response that includes every field you expect, including an item with a field missing.
  - Set the root name and choose readonly properties if the generated type should describe immutable data.
  - Press Generate, then copy the output or download it as a .ts file and paste it into your project.
example:
  caption: With the root name set to Root, the sample becomes an exported interface; the empty array is typed as unknown[].
  input: |
    { "id": 1, "name": "Ada", "active": true, "note": null, "tags": [] }
  output: |
    export interface Root {
      id: number;
      name: string;
      active: boolean;
      note: null;
      tags: unknown[];
    }
mistakes:
  - Generating from one sample that never omits a field. Add a second array item without that key to see the property become optional.
  - Treating generated types as runtime checks. Interfaces describe the sample you gave; they do not validate incoming data.
  - Sampling a field that happens to be null. It maps to the null type, so widen the type by hand if a string can appear later.
  - Forgetting that a root array becomes a type alias. Arrays and primitives use export type rather than export interface.
faq:
  - q: What happens to an array of objects?
    a: The items are merged into one interface. A property present in every item stays required, and one missing from at least one item becomes optional.
  - q: How are mixed array item types handled?
    a: Incompatible types become a union, such as string | number, so the generated type still describes every value the sample contained.
  - q: What if an array is empty?
    a: There is no item to inspect, so the element type is unknown[]. Replace it with the real type once you know what the array holds.
  - q: Are JSON keys that are not valid identifiers handled?
    a: Yes. A key such as content-type or a name with spaces is quoted in the interface, so the output stays valid TypeScript.
  - q: Is the generated output sent anywhere?
    a: No. Generation runs in a Web Worker in this tab, and the .ts download is built locally. Nothing is uploaded or stored.
---

JSON to TypeScript generates typed declarations from a sample document. Instead of hand-writing an interface for an API response, paste the response and get an exported type that matches its shape, including nested objects and arrays of records. Output uses two-space indentation and is ready to drop into a `.ts` file.

The generator distinguishes objects from everything else. A root object becomes an `export interface`, while a root array or a primitive becomes an `export type`, because an interface cannot describe an array. Nested values are typed from the sample: numbers become `number`, strings become `string`, booleans become `boolean`, and null becomes `null`. Arrays with a single item type become `string[]` or `Item[]`; incompatible item types become a union.

Arrays of objects are the interesting case. The generator merges their items into one interface so a list of records produces one type rather than a separate interface per element. A property that appears in every item stays required. A property missing from any item becomes optional, which is the honest reading of a heterogeneous response and the reason a sample with one complete item and one partial item is more useful than ten identical ones. An empty array has nothing to inspect, so it becomes `unknown[]` until you supply the real element type.

Property names that are not valid identifiers are quoted, which keeps output such as `"content-type": string;` legal. The root name option controls the exported name, and readonly properties marks each field `readonly` for data that should not be mutated after parsing.

Generated types describe the sample, not the contract. They are a starting point: review optionality, replace `unknown[]`, and narrow unions where the API guarantees a single shape. The output is one file with two-space indentation. Copy it into a types module, or download the `.ts` file and commit it beside the code that consumes the API. Renaming the root later is a find and replace, but setting the name up front keeps the generated export consistent with the rest of your project instead of leaving a generic placeholder in the codebase. To check the data itself, pair the types with [JSON Schema Validator](/json-schema-validator), and use [JSON Validator](/json-validator) to confirm the sample parses before generating anything.

Generation runs in a Web Worker, so a large response is processed without freezing the page. The result can be copied or downloaded as a `.ts` file. Your JSON never leaves the browser.
