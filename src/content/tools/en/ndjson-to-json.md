---
locale: en
toolId: ndjson-to-json
title: JSON Lines to JSON
description: "Convert JSON Lines into a JSON array, skipping invalid records or stopping at the first error, with optional pretty printing and blank-line control."
summary: "Collect newline-delimited JSON records into a single array. Choose how invalid and blank lines are handled, and optionally pretty-print every record while keeping number values exact."
steps:
  - "Paste or drop a JSON Lines file into the input pane."
  - "Choose whether to skip invalid lines, trim blank lines, and pretty-print each record."
  - "Press Run, then copy or download the resulting JSON array."
example:
  caption: "Two lines become one array."
  input: '{"id":1}\n{"id":2}'
  output: '[{"id":1},{"id":2}]'
mistakes:
  - "Assuming invalid lines are dropped by default; choose Skip invalid lines explicitly."
  - "Pretty-printing a huge dataset when a compact array would download much faster."
  - "Forgetting that blank lines are kept unless Trim blank lines is enabled."
faq:
  - q: "What exactly is produced?"
    a: "A single JSON array whose elements are the values from each non-blank line, in order. If a line holds an object or a number, that exact value becomes the corresponding element. The tool does not invent keys or wrap records unless you enable pretty printing."
  - q: "What happens to invalid lines?"
    a: "By default the run stops at the first bad line and reports its number, column, and hint. Turn on Skip invalid lines to continue past problems; those records are omitted from the output. Use the NDJSON Validator first if you need a full error inventory."
  - q: "Are blank lines included?"
    a: "Blank lines become null values when Trim blank lines is off, because they still occupy a position in the sequence. With trimming on, they are removed entirely and the array contains only records from non-empty lines."
  - q: "Does pretty-printing change the data?"
    a: "No. Formatting is applied to the text of each record, and number tokens are preserved as written. A large integer such as 9007199254740993 stays exact instead of being rounded through a JavaScript number."
  - q: "Can this handle very large files?"
    a: "Yes. Lines are streamed from the transferred file buffer in chunks, and progress is reported while the tool runs. Files above the preview limit require an explicit run, and outputs above four megabytes are offered as a download instead of being injected into the editor."
  - q: "Is anything uploaded?"
    a: "No. Reading, conversion, and formatting all happen inside your browser. There is no network request during tool use and no persistent storage of your data."
---

JSON Lines is convenient for producers and stream processors, but most JSON tools expect a single array or object. Converting between the two shapes is a common first step before analysing data, importing it into a database, or handing it to a formatter. This tool collects the lines into an array while giving you explicit control over the messy parts: broken records, blank lines, and output size.

## The conversion model

The worker reads the input in chunks and splits on newline characters as it goes. Each complete line is parsed to confirm it is valid JSON. Valid lines are appended to an output array, preserving their original text so numbers keep their exact representation. If pretty printing is enabled, each record is formatted with two-space indentation before being added. The result is assembled in a streaming builder, so the page never holds both a giant source string and multiple copies of the output.

Invalid lines are handled according to your choice. With the default behaviour, the run stops at the first problem and the error panel reports the line number, column, and a plain-English hint. Enabling Skip invalid lines continues past them and omits those records from the array. Neither mode silently changes a record: a line that parses is copied as-is, and a line that does not parse either stops the job or is left out.

Blank lines are a separate case. A trailing newline at the end of a file is normal and does not by itself create a blank record. Empty lines in the middle, however, are still positions in the sequence. With trimming off they become `null` elements; with trimming on they disappear. Most exports benefit from trimming.

## How to use it

1. Paste JSON Lines into the input pane or drop a `.ndjson` or `.jsonl` file onto the page.
2. Set the invalid-line, blank-line, and pretty-print options.
3. Press Run. Copy the array or download it as `result.txt` when the output is large.

## Choosing the output size

Pretty printing makes a result easier to read but can double or triple its size. For a file with hundreds of thousands of records, a compact array is usually the better choice because it downloads faster and can be processed by the next tool without reformatting. If you only need to inspect a few records, run with pretty printing on and then switch to the JSON Viewer for navigation.

When the output exceeds four megabytes, the worker returns it as a Blob. The page shows its size and offers a download button instead of trying to paint millions of characters into an editor. This is the same large-output path used by the converters, and it is what keeps the browser responsive on big datasets.

## Privacy

The file is decoded and processed in a Web Worker on your machine. Nothing is uploaded, no analytics observe the input, and no query parameter contains the data. The site's content security policy has `connect-src 'none'`, which makes the claim of zero network requests verifiable rather than a matter of trust.

## Common errors

An "encoding" error means the file was saved in a format other than UTF-8; re-save it as UTF-8. A syntax error with a line number points to a record that is not complete JSON. If every line looks valid but the run still stops, check for invisible characters such as a byte-order mark at the start of the first line.
