---
locale: en
toolId: json-to-ndjson
title: JSON to JSON Lines
description: "Turn a top-level JSON array into newline-delimited JSON, one compact record per line, ready for logs, datasets, and streaming data pipelines."
summary: "Split a JSON array into one compact JSON value per line. The result is easy to append to, easy to stream, and accepted by log shippers and data tools that expect JSON Lines."
steps:
  - "Paste a JSON array, or drop a .json file, into the input pane."
  - "Press Run. Each element becomes one line of compact JSON."
  - "Copy the lines or download them as a .ndjson file."
example:
  caption: "An array becomes two records."
  input: '[{"id":1},{"id":2}]'
  output: '{"id":1}\n{"id":2}'
mistakes:
  - "Passing an object instead of an array; NDJSON needs a sequence of values at the top level."
  - "Expecting indentation in the output; each record is intentionally one compact line."
  - "Appending lines to a file that still has a closing array bracket from an earlier export."
faq:
  - q: "Why must the input be an array?"
    a: "NDJSON represents a sequence of records. An array is the natural source because its elements already form an ordered sequence. A single object would produce one line, which is legal JSON Lines but almost never what someone asking for this conversion wants, so the tool explains the requirement instead of guessing."
  - q: "Why is each record on one line?"
    a: "The line is the record boundary. If a record were pretty-printed across several lines, a reader would no longer be able to split a stream on newlines. Compact output is a requirement of the format, not a styling choice."
  - q: "Will large numbers survive the conversion?"
    a: "Yes. The generator serializes values from the parsed syntax tree using their original number text. A 64-bit integer or a long decimal is written out unchanged rather than being rounded by a JavaScript number conversion."
  - q: "Can I convert nested arrays or objects?"
    a: "Yes. Each element can be any JSON value: an object, an array, a string, or a number. Nested structures remain inside their own line. Only the top-level array is flattened into lines."
  - q: "What happens with an empty array?"
    a: "The output is empty. That is consistent with the format: zero records produce zero lines. Add at least one element if you expected content."
  - q: "Is my data uploaded?"
    a: "No. Parsing and serialization run inside a Web Worker in the browser. There are no third-party requests, no analytics on the input, and nothing is written to persistent storage."
---

A JSON array is a complete document. A JSON Lines file is a sequence of independent documents that happen to be stored one per line. The difference sounds small, but it changes how data is produced and consumed. You can append a record to a JSON Lines file by writing one more line; appending to an array means editing the closing bracket. Log shippers and streaming frameworks prefer the line-based form because they can start reading before the file is finished.

## What the converter does

The tool parses the input into a typed syntax tree, then walks the top-level array and writes each element as a compact JSON value followed by a newline. Because the writer uses the parsed tree rather than a generic object serialiser, number tokens are preserved exactly. A long integer stays long, and a decimal with many digits is not shortened. Strings are escaped according to JSON rules, so a value containing a newline becomes `\n` inside its own line rather than breaking the record.

The output is built incrementally. For a large array the worker emits lines as it goes and reports progress, keeping the main thread free. When the result exceeds four megabytes the page offers it as a download instead of painting it into an editor. The download uses the `.ndjson` content type so downstream tools recognise the format.

## How to use it

1. Paste a JSON array into the input pane or drop a `.json` file onto the page.
2. Press Run. The tool checks that the root value is an array.
3. Copy the resulting lines or download them as a `.ndjson` file.

## Why the root must be an array

This is a deliberate guard. If the input were an object, the tool would have to decide whether to write the object itself, its values, or something derived from its keys. Each choice would be a guess, and a wrong guess would silently produce a file with the wrong shape. Reporting a clear error is safer. If you want one line from an object, you can wrap it in an array yourself: `[{"a":1}]` produces `{"a":1}`.

A common mistake is feeding the tool a file that looks like NDJSON but still has `[` and `]` around the whole thing. Those brackets make it one JSON array, which is exactly what this tool expects. Removing them would be a different operation; this converter assumes the array is intentional.

## Working with the result

Check the first and last lines of the output before feeding it to another system. Every line should parse on its own. If you plan to edit the file by hand, keep lines short and avoid adding commentary: JSON Lines has no comment syntax. A marker such as `_comment` inside a record is a convention some tools understand, but it is still just data.

For the reverse direction, JSON Lines to JSON collects the records back into an array. The two conversions are not perfectly symmetrical if blank lines were present, because records are positions in a sequence. Document whether your pipeline preserves empty lines and configure the trimming option accordingly.

## Privacy

Your data stays on this device. Parsing and serialization happen in a Web Worker, the site makes no network requests during tool use, and no content is placed in the URL or written to storage. The privacy page describes the same guarantees in plain language.

## Common errors

A syntax error at line one usually means the input is not JSON at all, or has a trailing comma. The "must be a top-level array" message means the root value is an object, string, or number. Wrap it in an array if that is what you intended.
