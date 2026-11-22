---
locale: en
toolId: ndjson-to-csv
title: JSON Lines to CSV
description: "Convert JSON Lines records into CSV with dot-path flattening, RFC 4180 quoting, an optional header row, and a spreadsheet formula injection guard."
summary: "Turn newline-delimited JSON records into a spreadsheet-friendly CSV. Nested objects become dot-path columns, values are quoted following RFC 4180, and formula-like cells can be neutralised."
steps:
  - "Paste or drop a JSON Lines file whose lines contain objects."
  - "Choose the delimiter, flattening, header, and formula-guard options."
  - "Press Run, then copy or download the CSV file."
example:
  caption: "Nested objects become dot-path columns."
  input: '{"name":"Ada","address":{"city":"London"}}\n{"name":"Grace","address":{"city":"New York"}}'
  output: 'name,address.city\nAda,London\nGrace,"New York"'
mistakes:
  - "Assuming every line is an object; scalar records cannot become CSV rows and are reported as errors."
  - "Disabling the formula guard when the CSV will be opened in a spreadsheet."
  - "Forgetting that flattening creates dotted column names that may need renaming for the target system."
faq:
  - q: "How are nested objects handled?"
    a: "With flattening enabled, a nested key becomes a dotted column name such as address.city. Arrays are serialised as JSON text in one cell unless they are switched to a joined representation. Without flattening, an object value is written as its JSON text."
  - q: "How is quoting decided?"
    a: "The writer follows RFC 4180. A field is wrapped in double quotes when it contains the delimiter, a quote, a carriage return, a newline, or leading or trailing spaces. Embedded quotes are doubled. Lines end with CRLF, which spreadsheets expect."
  - q: "What does the formula guard do?"
    a: "A cell beginning with =, +, -, @, a tab, or a carriage return can be interpreted as a formula by spreadsheet software. The guard prefixes such values with an apostrophe so they are read as text. Enable it whenever the CSV will be opened in Excel or a similar application."
  - q: "What if one line is invalid?"
    a: "By default the run stops at that line and reports it. Turn on Skip invalid lines to continue with the remaining records. Lines that parse but are not objects are reported separately, because a scalar cannot supply CSV columns."
  - q: "Are column names taken from every record?"
    a: "Columns are collected in first-seen order across the records that are kept. If a key appears only in a later record, earlier rows simply have an empty cell for that column. This mirrors how most CSV exporters behave."
  - q: "Does my data leave the browser?"
    a: "No. Parsing and CSV writing both run inside a Web Worker. There are no uploads, no analytics, and no third-party requests; the content security policy forbids outbound connections."
---

CSV and JSON Lines solve different problems. JSON Lines is excellent for machines: every line is a complete JSON value, and new records can be appended cheaply. CSV is excellent for people: spreadsheets, databases, and reporting tools open it directly. Converting from one to the other is a frequent step in a data workflow, and the awkward part is deciding how nested JSON becomes flat columns.

## How flattening works

Each non-empty line is parsed as JSON. Values that are objects become a single CSV row. When flattening is on, a nested property such as `address.city` becomes a column with that dotted name, and deeper nesting continues the same pattern. Arrays are written as JSON text by default, which keeps their structure intact inside one cell. A value that is itself an object without flattening is also written as JSON text.

Columns are discovered across all kept records in the order they first appear. The header row uses those names. If a key is missing from a particular record, its cell is empty. This is why a spreadsheet import often shows ragged-looking columns: the underlying data simply did not have a value there.

## Quoting and safety

The writer follows RFC 4180. A field is quoted when it contains the delimiter, a double quote, a carriage return, a newline, or leading or trailing whitespace. Quotes inside a field are doubled. Rows end with CRLF, which is what spreadsheet applications expect. Choosing a semicolon or tab delimiter is useful for locales where commas are decimal separators.

The formula guard is a small but important feature. Values starting with `=`, `+`, `-`, `@`, tab, or carriage return can be treated as formulas by spreadsheet software. A carefully crafted cell could then run an unintended action when the file is opened. Prefixing such values with an apostrophe makes them plain text. It is off by default because it changes the cell value, but it is the right choice for any CSV derived from untrusted input.

## How to use it

1. Paste JSON Lines into the input pane or drop a `.ndjson` or `.jsonl` file onto the page.
2. Pick a delimiter and decide on flattening, the header row, and the formula guard.
3. Press Run, then copy the CSV or download it as `result.txt`. Rename the downloaded file to `.csv` for your spreadsheet.

## Large inputs

Lines are streamed from a transferred file buffer in fixed-size chunks, so even a very large file never becomes one giant string on the main thread. Progress is reported during the run and the worker can be cancelled. A safety cap limits the number of rows collected for the CSV output, because a spreadsheet has its own row limit and building an unbounded table would defeat the point of streaming. If your dataset is larger, filter it before conversion.

## Privacy

The conversion happens entirely in your browser. The site makes no network requests while the tool is used, nothing is stored, and the data is never placed in a URL. That matters here because JSON Lines exports frequently contain customer records or internal identifiers.

## Common errors

A line that is valid JSON but not an object is reported as a row error; wrap scalars in an object with a meaningful key first. A syntax error includes the offending line number and a hint. If the output looks like one long row, check the delimiter: a file written with semicolons will not split into columns when opened with comma settings.
