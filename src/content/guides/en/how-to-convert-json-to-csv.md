---
locale: en
slug: how-to-convert-json-to-csv
title: How to convert JSON to CSV
description: 'A practical guide to turning JSON into CSV: choosing columns, flattening nested keys, quoting values, and avoiding spreadsheet formula hazards.'
updated: 2026-11-11
toolIds:
  - json-to-csv
  - csv-to-json
  - json-validator
faq:
  - q: Why does my CSV have columns like location.city?
    a: Nested objects are flattened into dot-path columns so each leaf value gets its own cell. Turn flattening off to keep the object as JSON text instead.
  - q: Why are some cells wrapped in quotes?
    a: Any value containing the delimiter, a quote, or a line break must be quoted under RFC 4180. Doubling inner quotes keeps the value unambiguous.
  - q: Can I convert the CSV back to JSON?
    a: Yes. CSV to JSON parses the same file, uses the first row as headers by default, and can infer numbers and booleans when you enable it.
---

JSON and CSV model data differently, and most conversion problems come from that mismatch rather than from the tools. JSON supports nesting, arrays, and typed values; CSV supports rows, columns, and text. A conversion is therefore a set of decisions about what to do with everything CSV cannot hold.

## Decide on the row shape first

CSV needs one row per record and one column per field. The natural JSON input is an array of objects, where each object becomes a row. A single object becomes one row. Arrays of arrays are also accepted, but they carry no column names, so the output is only useful when you add a header yourself.

If the document is not an array or an object—a bare string, a number, or a deeply nested tree with a single root—decide what the table should represent before converting. It is usually better to pick an array inside the document than to flatten the whole tree into one row.

## Handle nesting deliberately

With flattening enabled, `{"location": {"city": "London"}}` becomes a column named `location.city`. That preserves information and keeps columns readable. Turn flattening off if the receiving system expects the nested object as a JSON string in one cell.

Arrays are the harder case. A list of tags can be joined into a readable cell (`math, writing`) or kept as JSON (`["math","writing"]`). Joining is friendlier for a spreadsheet; keeping JSON is better when the file will be parsed again later. Pick one, and document it, because a joined value cannot be split back reliably if an item itself contains a comma.

## Get quoting and delimiters right

CSV is not simply “values separated by commas”. A value containing a comma, a quote, or a line break must be wrapped in double quotes, and any quote inside it must be doubled. A writer that skips this produces a file that looks fine until someone opens it and finds columns shifted by one.

Delimiter choice is regional. Comma is standard, but many European locales expect semicolons because the comma is the decimal separator. Tab-separated output is useful when pasting into a spreadsheet that already has a text import step.

## Avoid the formula trap

Spreadsheets execute cells that begin with `=`, `+`, `-`, or `@`. If a JSON value came from user input, a cell like `=HYPERLINK(...)` becomes a live formula. The JSON to CSV tool can prefix those cells with an apostrophe so they are stored as text. Enable the guard whenever the data is not fully trusted.

## Convert and check the result

Paste the JSON, choose the delimiter and array handling, and convert. Check three things before sharing the file: the column names match the fields you expected, a value containing a comma is quoted, and the row count matches the source array. If something looks wrong, minify or validate the JSON first—a subtle syntax error can change the parsed shape.

The conversion runs in your browser. Nothing is uploaded, so customer data and production exports can be converted without a third-party service.
