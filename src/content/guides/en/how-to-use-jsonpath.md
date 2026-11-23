---
locale: en
slug: how-to-use-jsonpath
title: How to use JSONPath
description: "Learn JSONPath syntax with examples: root, dot and bracket access, wildcards, filters, slices, and recursive descent, all tested locally in your browser."
updated: 2026-11-23
toolIds:
  - jsonpath-tester
  - json-viewer
  - json-formatter
faq:
  - q: What is JSONPath?
    a: JSONPath is a query language for JSON, similar to XPath for XML. It selects values from a document using a compact expression starting with $.
  - q: Is JSONPath a standard?
    a: There is no single standard. This site follows the common syntax used by most tools, including filters, slices, and recursive descent.
  - q: Why did my query return nothing?
    a: Check the root symbol, property names, and array indexes. A typo in a key name silently yields an empty result rather than an error.
  - q: Can JSONPath modify a document?
    a: No. It only reads and selects values. To change data, copy the result and edit it in the formatter or viewer.
  - q: How many results can be returned?
    a: The tester caps visible matches for responsiveness, but reports the true total and lets you download the full result.
---

JSONPath lets you ask a JSON document for the values you care about without writing a program. An expression starts at the root (`$`) and walks through keys and array indexes.

## Basic access

- `$` is the whole document.
- `$.store.book` reads a property named `book` inside `store`.
- `$['store']['book']` is the same thing, which is useful when a key contains spaces or special characters.
- `$.store.book[0]` reads the first item of an array.
- `$.store.book[-1]` reads the last item.

Dot notation is shorter; bracket notation is safer for unusual keys.

## Wildcards and recursion

- `$.store.book[*]` selects every book.
- `$..author` finds every `author` field at any depth, which is handy for scattered metadata.
- `$.store.book[0,2]` selects the first and third books.

## Slices

Array slices look like Python: `$.store.book[1:3]` selects indexes 1 and 2, and `$.store.book[:2]` takes the first two. A step such as `[::2]` selects every other item.

## Filters

Filters live inside parentheses and start with `?`:

- `$.store.book[?(@.price < 10)]` selects books cheaper than 10.
- `$.store.book[?(@.category == 'fiction')]` matches a string value.
- `$.store.book[?(@.isbn)]` keeps items that have an `isbn` field.

Combine conditions with `&&` and `||`, and negate with `!`. Comparisons support `==`, `!=`, `<`, `<=`, `>`, and `>=`.

## Common mistakes

- Forgetting the leading `$`.
- Using JavaScript property access such as `store.book` without the root.
- Mixing up 0-based array indexes.
- Expecting a filter to return the parent object instead of the matched item.

Test expressions against a real document in the JSONPath tester, then send the result to another tool with the shared "Send to" menu.

## Working with the tester

Paste or drop a document into the input pane, type an expression, and read the matched values with their paths. The tester runs entirely in your browser, so large files never leave your device. Switch between result modes to see values, flattened arrays, the first match, paths only, or paths paired with values.

Each match shows its JSONPath, which you can copy directly into code. When a query returns more than the display cap, the status line reports the true total and a download button saves the complete list.

## Performance tips

- Narrow with a filter before applying a wildcard so you do not walk the whole tree.
- Use `$.path` instead of `$..` when you know the structure, because recursive descent scans every node.
- For very large files, start with a small sample to confirm the expression, then run it on the full document.
- Keep expressions readable: one predicate per filter, and break complex queries into steps.

## Reading the results

A successful query returns an array of matches even when there is only one. An empty array means the expression was valid but matched nothing, while a red error message means the syntax itself was rejected. Fix syntax errors first, then tune the predicate until the count matches your expectation.