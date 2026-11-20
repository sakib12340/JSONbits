---
locale: en
toolId: jsonpath-tester
title: JSONPath Tester
description: 'Test JSONPath queries against your JSON and see every match with its path and value. Filters, slices, and unions. Runs in your browser, nothing uploaded.'
summary: Run a JSONPath expression against a document and read each match with its exact path and value, plus timing and truncation details.
steps:
  - Paste a document and an expression such as $.store.books[?(@.price < 10)], or use the sample to see filters and slices working.
  - Press Run or Ctrl/Cmd+Enter. The result lists every match with its path and value, along with the total count and the time taken.
  - Copy the whole result or download it as a .json file, then paste the expression into the library or test that will run it.
example:
  caption: A filter returns one match, and the result keeps the expression, path, value, and timing.
  input: |
    {
      "store": {
        "books": [
          { "title": "A", "price": 8 },
          { "title": "B", "price": 14 }
        ]
      }
    }
  output: |
    {
      "expression": "$.store.books[?(@.price < 10)]",
      "matches": [
        { "path": "$.store.books[0]", "value": { "title": "A", "price": 8 } }
      ],
      "total": 1,
      "truncated": false,
      "timeMs": 1
    }
mistakes:
  - Grouping filter conditions with parentheses. This subset supports && and || without parentheses, so split a compound condition.
  - Leaving string values unquoted in a filter. Compare against a number directly, but write a string comparison as [?(@.status == 'open')].
  - Assuming every JSONPath implementation matches. Recursive descent, unions, and filters differ between libraries, so confirm in the target.
  - Writing a broad expression such as $..* and expecting everything back. Matches are capped at 2,000 and the result near 2 MB.
faq:
  - q: Which JSONPath syntax is supported?
    a: Root $, dot and bracket keys, array indexes including negative ones, wildcards, recursive descent, slices, unions, and filters with comparison operators, existence tests, not, && and ||.
  - q: Are filters able to compare strings?
    a: Yes, with single or double quotes, against strings, numbers, true, false, and null. A bare member name such as @.id tests existence, and ! negates it.
  - q: Why does the result say truncated?
    a: Each value is capped at 20,000 characters, matches at 2,000, and the whole result at about 2 MB. When a cap applies, the flag is set so a partial answer is never mistaken for a complete one.
  - q: Where are syntax errors shown?
    a: Directly under the query field, so a missing bracket or an unsupported operator is reported next to the expression that caused it.
  - q: Does the document leave the browser?
    a: No. The query runs in a Web Worker in this tab. The document and the result stay on the device and nothing is written to storage.
---

JSONPath is a small query language for JSON, the equivalent of a CSS selector for a document. The JSONPath Tester runs an expression against your data and returns a structured result rather than a wall of matches, which makes it practical to check an expression before it goes into a test, a monitoring rule, or application code.

The supported subset covers the syntax most libraries agree on. `$` is the root, `.key` and `['key']` read a member, `[0]` and `[-1]` index an array, and `[*]` or `.*` selects all children. Recursive descent with `..key` or `..*` searches every level, slices such as `[1:4:2]` take a range, and unions such as `[0,2]` or `['a','b']` combine selections. Filters use `[?(@.price < 10)]` with `==`, `!=`, `<`, `<=`, `>`, and `>=`, comparing against strings, numbers, `true`, `false`, or `null`. An expression such as `[?(@.id)]` tests existence, `!` negates it, and `&&` and `||` join conditions without parentheses.

The output is JSON you can keep. It records the expression, an array of matches with a `path` and a `value`, the total, a `truncated` flag, and the time in milliseconds. That shape is easy to paste into a bug report or a test snapshot, and the paths use the same notation the viewer copies, so a match can be traced back to the document.

Two habits make an expression trustworthy. Run the broadest version of the query first, such as `$.items[*]`, and check the match count against something you can verify by hand. A filter that returns fewer rows than expected is usually a type mismatch: `"10"` and `10` are different values, and a numeric comparison will not match a string. Then run the same expression in the tool and in the library that will execute it in production. Recursive descent and unions are where implementations diverge most, so a query that works here may need a small rewrite in a Python or Java client.

Result size is bounded on purpose. A single value stops at 20,000 characters, the match list at 2,000 entries, and the whole result at roughly 2 MB, with `truncated` set when a limit applies. A broad expression on a large document therefore returns quickly instead of stalling the tab.

Queries run in a Web Worker on a document that never leaves the browser. For exploring a document by hand, [JSON Viewer](/json-viewer) shows the same paths in a tree, and [JSON Schema Validator](/json-schema-validator) checks the shape of the data you found.
