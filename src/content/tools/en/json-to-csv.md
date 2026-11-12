---
locale: en
toolId: json-to-csv
title: JSON to CSV
description: Convert JSON to CSV in your browser. Flatten nested keys into dot paths, choose the delimiter, keep arrays, and download clean RFC 4180 output.
summary: Turn an array of JSON objects into spreadsheet-ready CSV, with nested keys flattened and quoting handled correctly.
steps:
  - Paste an array of objects, a single object, or drop a .json file. The sample is a small team list with nested location fields and tags.
  - Choose the delimiter, decide whether nested keys are flattened with dot paths, and whether arrays are joined or kept as JSON.
  - Press Convert or Ctrl/Cmd+Enter, then copy the CSV or download it as a .csv file with CRLF line endings.
example:
  caption: Nested objects become dot-path columns and arrays are joined by default.
  input: |
    [{ "name": "Ada", "location": { "city": "London" }, "tags": ["math", "writing"] }]
  output: |
    name,location.city,tags
    Ada,London,"math, writing"
mistakes:
  - Feeding the converter a bare value such as a string or number. It needs an object or an array of objects to derive columns.
  - Converting an empty array, which has no rows and therefore no columns; the tool reports this instead of emitting an empty file.
  - Forgetting that commas inside a value must be quoted. The writer handles that automatically, so do not hand-edit the CSV afterwards.
  - Opening the file in a spreadsheet that expects semicolons. Pick the semicolon delimiter for locales that use it.
faq:
  - q: How are nested objects handled?
    a: With flattening on, nested keys become dot-path columns such as location.city. Turn it off to keep the object as a JSON string in a single cell.
  - q: What happens to arrays inside an object?
    a: By default their values are joined with commas into one cell. Choose Keep as JSON to serialise the array instead, which is safer for re-importing later.
  - q: Is the CSV quoted correctly?
    a: Yes. Fields containing the delimiter, quotes, or line breaks are wrapped in quotes and inner quotes are doubled, following RFC 4180.
  - q: Why does the output use CRLF line endings?
    a: Spreadsheet applications expect CRLF, so the writer emits it for maximum compatibility with Excel and LibreOffice.
  - q: Can I stop formulas from running in a spreadsheet?
    a: Yes. Enable Guard spreadsheet formulas and cells starting with =, +, -, or @ are prefixed with an apostrophe so they are treated as text.
  - q: Is my JSON uploaded during conversion?
    a: No. The conversion runs in a Web Worker in this browser tab and the download is built locally from the result.
---

JSON to CSV converts structured data into a table. It accepts an array of objects (the usual API shape), a single object, or an array of arrays, and derives the columns from the keys it finds. Nested objects are flattened into dot-path columns such as `location.city`, which keeps a deeply nested record readable in a spreadsheet without losing information.

Arrays are the one ambiguous case, so the tool makes the choice explicit. Joined values produce a readable cell like `math, writing`; keeping arrays as JSON preserves the structure for a later round trip. Quoting follows RFC 4180: any field containing the delimiter, a quote, or a line break is wrapped in quotes, and inner quotes are doubled.

The converter also protects against a common spreadsheet hazard. With the formula guard enabled, cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe so a spreadsheet does not execute them. Output uses CRLF line endings for Excel and LibreOffice compatibility, and the file downloads with a `text/csv` type. Conversion happens in this tab; nothing is uploaded or stored.
