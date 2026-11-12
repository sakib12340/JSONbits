---
locale: en
toolId: json-formatter
title: JSON Formatter
description: Format and indent JSON in your browser with 2-space, 4-space, or tab indents. Precise line and column errors, big-number safe, nothing uploaded.
summary: Turn compact or messy JSON into a consistently indented document, without changing a single value.
steps:
  - Paste JSON into the input pane, drop a .json file anywhere on the page, or press Open file. Sample loads a document with nested objects, arrays, and a 64-bit integer.
  - Choose an indent size in the toolbar. Two spaces is the default; four spaces or tabs match most editors and configuration files.
  - Press Format or Ctrl/Cmd+Enter, then copy the result or download it as formatted.json.
example:
  caption: Compact input on the left, formatted output on the right.
  input: '{"project":"JSON Bits","private":true,"downloads":9007199254740993,"tags":["json","formatter"]}'
  output: |
    {
      "project": "JSON Bits",
      "private": true,
      "downloads": 9007199254740993,
      "tags": ["json", "formatter"]
    }
mistakes:
  - Trailing commas after the last property or array item are invalid in JSON. Delete the comma, or run the document through JSON Repair.
  - Comments copied from JavaScript (// or /* */) are not part of the JSON grammar and must be removed.
  - Unquoted keys and single-quoted strings are valid JavaScript but not valid JSON. Wrap keys and strings in double quotes.
  - Smart quotes pasted from a word processor look like double quotes but are a different character. Replace them with straight quotes.
faq:
  - q: Is my JSON uploaded anywhere?
    a: No. Formatting runs in a Web Worker inside this browser tab. The page makes no network request while you work, and no server exists that could receive the document.
  - q: Does formatting change big numbers?
    a: No. The formatter copies number tokens exactly instead of parsing and re-serialising them, so 9007199254740993 keeps all sixteen digits and long decimals keep every decimal place.
  - q: How large a file can I format?
    a: Files up to 100 MB are accepted. Inputs below 1 MB update as you type; larger documents run on demand with a progress state so the page never freezes.
  - q: Why does valid-looking JSON produce an error?
    a: The usual causes are a trailing comma, a comment, or single quotes. The error panel names the line and column, shows an excerpt, and suggests the correction in plain English.
  - q: Can I format a JSON file without opening it in a text editor?
    a: Yes. Drop the file on the page or press Open file. The formatter reads it locally, shows the file name and size, and offers the formatted result as a download.
---

The JSON Formatter turns compact or unevenly spaced JSON into a document that is easy to read, review, and compare. It parses with a tokenizer rather than `JSON.parse`, so number tokens are copied exactly as written. A 64-bit integer such as `9007199254740993` keeps all of its digits instead of silently becoming `9007199254740992`, and high-precision decimals keep every place. Only whitespace ever changes.

Everything runs in a Web Worker inside this browser tab. Text you paste, drop, or open is never sent anywhere: there is no upload endpoint, no account, and no analytics that read the content. Large documents are streamed through the same worker, so a multi-megabyte file produces a progress state rather than a frozen page.

If the document is invalid, the formatter stops at the first problem and reports the line, the column, a short excerpt, and a plain-English hint. Fix the input and run again. The indent preference is stored in this browser only; the JSON itself is never persisted.
