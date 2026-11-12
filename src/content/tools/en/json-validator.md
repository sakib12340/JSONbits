---
locale: en
toolId: json-validator
title: JSON Validator
description: Validate JSON syntax in your browser and get the exact line and column of every error, with plain-English hints. Nothing is uploaded or stored.
summary: Check whether a document is valid JSON, and see precisely where and why it fails when it is not.
steps:
  - Paste JSON into the input pane or drop a .json file on the page. The sample button loads a short document you can break on purpose.
  - Press Validate or Ctrl/Cmd+Enter. Validation is a syntax check, so it finishes in milliseconds even for large documents.
  - Read the result. Valid JSON reports object, array, key, and value counts; invalid JSON reports the line, column, and a suggested fix.
example:
  caption: A trailing comma is reported at the line and column where the parser stopped.
  input: |
    {
      "name": "JSON Bits",
      "private": true,
    }
  output: |
    Invalid JSON
    Line 4, column 1
    Hint: remove the trailing comma before the closing brace.
mistakes:
  - A trailing comma after the final property is the most common failure. JSON allows a comma only between members, never after the last one.
  - Comments, unquoted keys, and single-quoted strings come from JavaScript habits and are rejected by the JSON grammar.
  - Raw line breaks or tabs inside a string are invalid; use the escaped forms \n and \t instead.
  - Two values side by side, or a missing comma between properties, produce an error that points at the second value rather than the missing comma.
faq:
  - q: Is this a JSON Schema validator?
    a: Not yet. This page checks JSON syntax only, which is what most broken documents fail on. A separate JSON Schema validator is planned as a later tool.
  - q: Does validation send my data anywhere?
    a: No. The check runs in a Web Worker in this tab, and the page is built so it cannot make network requests while a tool is open.
  - q: How precise is the error location?
    a: The validator reports the line and column where parsing stopped, shows an excerpt with the offending character, and adds a hint that names the likely cause.
  - q: Can I validate a large file?
    a: Yes. Files up to 100 MB are accepted. Large documents run on demand with a progress state, and the result stays a summary instead of rendering the file as text.
  - q: Does valid JSON mean the data is correct?
    a: No. Syntax validity only means the document follows the JSON grammar. Required fields, types, and business rules need a schema or your own checks.
---

The JSON Validator answers one question precisely: does this document follow the JSON grammar, and if not, where does it break? Paste a document, drop a file, or load the sample, then press Validate. The check runs in a Web Worker, so even a multi-megabyte file is examined without blocking scrolling or typing in the page.

For valid input the result summarises the document: how many objects and arrays it contains, how many values and keys were counted, and how long the check took. For invalid input the panel reports the line and column where parsing stopped, shows the surrounding characters, and explains the likely cause in plain English, for example that a comma before a closing brace is not allowed.

Validation does not modify your data and does not store it. Nothing is uploaded, and the document disappears when the tab closes. Use the formatter when you want the same check plus indented output, or JSON Repair when the mistakes are mechanical and you would rather have them fixed automatically.
