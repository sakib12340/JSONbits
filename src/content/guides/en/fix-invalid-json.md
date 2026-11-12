---
locale: en
slug: fix-invalid-json
title: How to fix invalid JSON
description: The mistakes that make JSON invalid, which ones can be repaired automatically, and how to fix the rest without guessing or uploading your file.
updated: 2026-11-11
toolIds:
  - json-repair
  - json-validator
  - json-formatter
faq:
  - q: Can every invalid document be repaired?
    a: No. Mechanical mistakes such as trailing commas or smart quotes can be rewritten. A missing bracket or a truncated file needs a manual fix because no tool can invent the missing data.
  - q: Is repaired JSON safe to use?
    a: Review the list of applied fixes first. The result parses, but a removed comment or a converted True may have carried meaning you need to confirm.
  - q: Why does the validator report only one error?
    a: Parsers stop at the first failure. Fix that error and validate again to reveal the next one.
---

Invalid JSON is usually invalid for one of a handful of reasons, and most of them are mechanical. Knowing which category a mistake falls into tells you whether a repair tool can handle it or whether a person has to make a decision.

## Mistakes a tool can fix

These are syntax-level problems with one correct answer:

- **Trailing commas** after the last property or array item.
- **Comments**, which JSON does not support.
- **Single-quoted strings** and unquoted keys copied from JavaScript.
- **Smart quotes** pasted from a word processor.
- **Python literals** such as `True`, `False`, `None`, and `nan`.

A repair pass rewrites these and lists each change. That list matters: converting `True` to `true` is mechanical, but deleting a comment throws information away, and you should know it happened.

## Mistakes that need a person

These cannot be guessed safely:

- A missing closing brace or bracket.
- A truncated file.
- A value that was never written, such as `"name": ,`.
- Two documents concatenated into one.
- A key that appears twice with different values.

For these, the validator reports where the structure stopped making sense. Read the excerpt, count the braces around it, and compare with the shape you expected. A formatter helps once the document parses; before that, indentation is only a hint.

## A reliable order of operations

1. Validate to get the first error and its line and column.
2. If the cause is on the mechanical list, run the repair tool and review the fix list.
3. If not, fix the structure by hand at the reported position.
4. Validate again. Repeat until the document parses.
5. Format the result so the next reader can see the structure.

Do not skip the second validation. Repair can produce a document that parses but no longer matches the original intent, and the only defence is checking the changes.

## Preventing the next failure

Generate JSON with a serialiser instead of writing it by hand, keep comments in the source format, and avoid round-tripping through a word processor. If a file needs comments, JSON5 or YAML is a better choice than JSON with comments bolted on.

All of these steps can be done in this browser. The repair, validation, and formatting tools run in a Web Worker, so a production file never has to be uploaded to fix a missing quote.
