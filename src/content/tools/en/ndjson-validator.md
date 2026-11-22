---
locale: en
toolId: ndjson-validator
title: JSON Lines Validator
description: "Validate JSON Lines files line by line with precise line numbers, blank-line counts, and a capped list of errors you can click to jump to directly."
summary: "Check every line of a JSON Lines or NDJSON file independently. The validator reports exact line numbers, separates blank lines from invalid ones, and lets you jump straight to the first bad record."
steps:
  - "Paste your JSON Lines data or drop a .ndjson / .jsonl file onto the page."
  - "Choose whether to stop at the first error, then press Validate."
  - "Read the summary and the error list; click any error to jump to that line in the input."
example:
  caption: "A valid line followed by an invalid one."
  input: '{"id":1,"name":"Ada"}\n{"id":2,"name":}'
  output: 'Lines 2 · Valid 1 · Invalid 1 · Blank 0\nL2:17 Expected a value'
mistakes:
  - "Treating the whole file as one JSON document; JSON Lines validates each line separately."
  - "Forgetting that a trailing newline is normal and does not create an extra record."
  - "Assuming the first error is the only error; turn off stop-at-first to see capped results across the file."
faq:
  - q: "What is a JSON Lines file?"
    a: "It is a text file where every line is a complete, independent JSON value. There is no surrounding array and no commas between records. That makes it possible to append a new record without rewriting the file, and it lets readers process the file a line at a time."
  - q: "How is validation different from a normal JSON validator?"
    a: "A normal validator parses one document. Here each line is its own document, so the tool reports a line number for every problem and counts valid, invalid, and blank lines separately. A single broken record does not make the rest of the file unusable."
  - q: "Why is the error list capped?"
    a: "A large broken file can contain thousands of errors. Rendering all of them would freeze the page, so the tool keeps the first one thousand and reports the true total. The list is virtualized, which means only the rows on screen exist in the document."
  - q: "Does the tool upload my file?"
    a: "No. The file is read in your browser and streamed to a Web Worker in chunks. There are no network requests, nothing is written to storage, and the contents never appear in the URL."
  - q: "What does stop at the first error do?"
    a: "It ends the scan as soon as a bad line is found. That is useful when you are fixing a file one problem at a time and do not want to wait for a full pass over a very large input."
---

JSON Lines, also called NDJSON, stores one JSON value per line. The format is deliberately small: no enclosing array, no commas, and no shared indentation rules. That simplicity makes it a favourite for logs, event streams, and large datasets, because a producer can append one line and a consumer can read one line without loading the whole file. The trade-off is that a single malformed line does not produce a single file-level error the way a normal JSON document would. Each line has to be checked on its own.

## What this validator reports

The tool reads the input in fixed-size chunks and splits lines as it goes, so a hundred-megabyte file does not become one enormous JavaScript string. Every line is parsed independently. Blank lines are counted separately from real records because a trailing newline is normal and an empty line in the middle is usually harmless. Valid and invalid counts are reported alongside the total line count.

When a line fails to parse, the tool records the line number, the column where the problem was found, the message, and a plain-English hint. The first one thousand errors are kept, with the true total reported next to them. The list is virtualized: only the rows currently on screen are created, so scrolling through a long error list stays smooth. Clicking a row moves the editor cursor to that line.

## How to use it

1. Paste JSON Lines into the input pane or drop a `.ndjson` or `.jsonl` file anywhere on the page.
2. Decide whether to stop at the first error. Leave it off to see a capped sample of all problems.
3. Press Validate, read the summary, and click an error to jump to the offending line.

## Reading the results

A high invalid count with a low line count usually means the file is actually a pretty-printed JSON array rather than JSON Lines. That format belongs in the JSON Formatter; convert it to NDJSON first. A high blank count often comes from an export that inserts separators between records. Enable trimming when converting if you want those lines dropped.

Column numbers are relative to each line, not to the file. That matches how editors show the cursor and makes the error actionable: the column tells you where in that record the parser gave up. The hint explains the likely cause in ordinary language, such as an unterminated string or a missing comma.

## Large files

Files above the preview limit are not painted into the editor. Instead the page shows the file name and size and waits for an explicit run. The worker reports progress while it scans, and cancelling stops the job. Out-of-memory conditions are reported with a friendly message rather than crashing the tab. This keeps the main thread responsive even when the input is far larger than the browser's comfortable editing range.

## Privacy

A JSON Lines file can contain personal data, tokens, or customer records. The file is read locally, processed inside a Web Worker, and never uploaded. The site has no analytics and a content security policy that forbids outbound connections. Nothing you paste or drop is saved to local or session storage.

## Common errors

A line containing a single number or string is valid JSON and is counted as valid, even though many pipelines expect objects. If your downstream tool needs objects, convert with the NDJSON to CSV tool and review the "must be an object" messages. A file encoded as UTF-16 will be rejected with an encoding hint; save it as UTF-8 first.
