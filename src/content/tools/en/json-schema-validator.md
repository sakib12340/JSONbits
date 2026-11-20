---
locale: en
toolId: json-schema-validator
title: JSON Schema Validator
description: 'Validate a JSON document against a JSON Schema and read each failure as a path and a plain-English message. Runs in your browser, nothing uploaded.'
summary: Check a document against a schema, with local references resolved, clear errors per path, and an honest list of keywords that are not implemented.
steps:
  - Paste the schema in the first pane and the document in the second, or load the sample, which omits a required property.
  - Press Run or Ctrl/Cmd+Enter. Validation is explicit rather than live, so both inputs are checked in one pass.
  - Read each error by JSON path, fix the document or the schema, and run again until the report is clean.
example:
  caption: Each failure names the path and says what the schema expected; unsupported keywords are listed separately.
  input: |
    {
      "type": "object",
      "required": ["id", "email"],
      "properties": {
        "id": { "type": "integer" },
        "email": { "type": "string" }
      }
    }
  output: |
    2 errors
    $.id: expected integer, found string
    $: missing required property "email"
mistakes:
  - Expecting remote references to resolve. Only local $ref targets under #, #/$defs, and #/definitions are followed.
  - Assuming a clean result means full draft support. Keywords outside the implemented set are listed rather than silently ignored.
  - Validating before the schema is complete. A schema with a typo in a keyword name may accept a document it should reject.
  - Confusing validation with type generation. A passing document can still differ from the types you expect in code.
faq:
  - q: Which keywords are supported?
    a: Boolean schemas, local $ref, type, enum, const, properties, required, additionalProperties, minProperties, maxProperties, items, minItems, maxItems, uniqueItems, minLength, maxLength, pattern, minimum, maximum, exclusive bounds, multipleOf, allOf, anyOf, oneOf, and not.
  - q: What about format, if/then/else, or patternProperties?
    a: They are not implemented. The result lists them honestly instead of passing or failing silently, so you know which parts of the schema were not evaluated.
  - q: Can a schema reference another file?
    a: No. Only local references are resolved, because the page makes no network requests. Combine the definitions into one schema with $defs.
  - q: How are errors reported?
    a: Each failure shows a JSON path and a short plain-English message, such as a missing required property or a value of the wrong type.
  - q: Is my schema or document uploaded?
    a: No. Both stay in the browser and are checked in a Web Worker in this tab. Nothing is sent to a server or written to storage.
---

JSON Schema describes what a valid document looks like: which properties exist, which are required, what types they hold, and how values are constrained. The JSON Schema Validator checks a document against a schema and reports each failure with a JSON path and a short message, so a rejected payload explains itself instead of returning a single generic error.

Validation is explicit. Both panes are read when you press Run or Ctrl/Cmd+Enter, which suits a schema and document that change independently and avoids re-running a large check on every keystroke. The implemented keywords cover the common core: boolean schemas, local `$ref` targets under `#`, `#/$defs/...`, and `#/definitions/...`, `type`, `enum`, `const`, `properties`, `required`, `additionalProperties` as a boolean or a schema, `minProperties`, `maxProperties`, `items` as a single schema or a tuple array, `minItems`, `maxItems`, `uniqueItems`, `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, numeric `exclusiveMinimum` and `exclusiveMaximum`, `multipleOf`, and the combinators `allOf`, `anyOf`, `oneOf`, and `not`.

The tool is deliberately honest about coverage. Keywords it does not implement, such as `format`, `patternProperties`, `if`/`then`/`else`, `contains`, `dependentRequired`, and `propertyNames`, are listed in the result. A clean pass therefore means the schema passed for the keywords that ran, and the list tells you what was skipped. That is more useful than a false sense of completeness, especially when a schema was written for a validator with broader support.

References stay local because nothing is fetched. A schema that depends on a remote URL needs its definitions inlined under `$defs` first. That constraint is the same one that keeps the tool private: no request leaves the page.

Local references keep a larger schema readable. Put shared shapes under `$defs` and point at them with `#/$defs/Address`; the validator resolves that target while it walks the document, so one definition can serve several properties. Error paths are reported in JSONPath form, starting at `$`, which makes them easy to copy into [JSONPath Tester](/jsonpath-tester) or a log line. A message such as `$.items[3].price` points at the exact element instead of the whole array. Fix the first error, run again, and work down the list, since one structural mistake often produces several downstream failures. Each run re-reads both panes, so a change to the schema and a change to the document can be tested together.

Use it before shipping a fixture, while debugging a 422 from an API, or when reviewing a schema someone else wrote. [JSON Validator](/json-validator) checks syntax, [JSON to TypeScript](/json-to-typescript) turns a sample into types, and [JSONPath Tester](/jsonpath-tester) helps inspect the exact value an error points at.
