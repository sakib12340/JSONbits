---
locale: en
toolId: csv-to-json
title: CSV to JSON
description: Convert CSV to JSON in your browser. Detect the delimiter, use the first row as headers, and optionally infer numbers and booleans from cell values.
summary: Turn spreadsheet rows into a JSON array, with correct handling of quoted fields, embedded commas, and line breaks.
steps:
  - Paste CSV or drop a .csv file. Leave the delimiter on Auto-detect unless you know the file uses a specific one.
  - Keep First row is a header on to get named properties, or turn it off to receive an array of arrays. Detection of numbers and booleans is optional.
  - Press Convert or Ctrl/Cmd+Enter, then copy the JSON or download it as a .json file.
example:
  caption: Headers become property names; quoted fields with commas stay intact.
  input: |
    name,role,active
    Ada Lovelace,Engineer,true
    Grace Hopper,Admiral,false
  output: |
    [
      { "name": "Ada Lovelace", "role": "Engineer", "active": true },
      { "name": "Grace Hopper", "role": "Admiral", "active": false }
    ]
mistakes:
  - CSV files that use semicolons or tabs but stay on comma detection. Auto-detect handles most cases; pick the delimiter when it does not.
  - Values starting with 0, such as postal codes, being converted to numbers. Leave detection off to keep every cell a string.
  - Unbalanced quotes around a field, which swallows the following delimiter and shifts every column in that row.
  - Empty trailing lines creating a blank object. Empty lines are skipped, but stray delimiters still produce a row.
faq:
  - q: How does delimiter detection work?
    a: The parser samples the first rows and picks the delimiter that produces a consistent column count. If a file is ambiguous, choose comma, semicolon, tab, or pipe explicitly.
  - q: Should I enable type detection?
    a: Only when the column is genuinely numeric or boolean. It turns 42 into a number and true into a boolean, but it also turns a ZIP code like 01234 into 1234.
  - q: What happens without a header row?
    a: Each row becomes an array of values, so the result is an array of arrays. Nothing is guessed about column names.
  - q: Are quoted fields with commas handled?
    a: Yes. Fields wrapped in double quotes may contain the delimiter, quotes, or line breaks, and the parser keeps them as one value.
  - q: How large a CSV can I convert?
    a: Files up to 100 MB are accepted. Parsing runs in a Web Worker with a progress state for large inputs, so the page stays responsive.
  - q: Is my CSV uploaded?
    a: No. The file is read locally, parsed in this tab, and never sent to a server.
---

CSV to JSON turns rows into structured data. The parser understands quoted fields, doubled quotes, embedded delimiters, and line breaks inside a cell, so an exported spreadsheet arrives as the values you see rather than a shifted mess. With headers enabled, the first row supplies property names and every following row becomes an object.

Type detection is deliberately optional. It is convenient for a column of counts or flags, but it destroys leading zeros, long identifiers, and phone numbers. Leaving it off means every cell stays a string, which is the safer default when the JSON feeds a form or an API that expects exact text.

Delimiter detection covers comma, semicolon, tab, and pipe; if a file mixes conventions, choose the delimiter yourself. Empty lines are skipped rather than turned into blank objects. The conversion runs in a Web Worker and the result downloads as `application/json`, with nothing uploaded and nothing persisted after the tab closes.
