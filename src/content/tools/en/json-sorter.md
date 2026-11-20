---
locale: en
toolId: json-sorter
title: JSON Sorter
description: 'Sort JSON keys alphabetically at every depth or only at the top level. Numbers keep their exact text. Runs in your browser, nothing uploaded.'
summary: Reorder object keys A to Z or Z to A without touching values, arrays, or number precision, so two documents compare cleanly.
steps:
  - Paste JSON or drop a file, then choose A to Z or Z to A and decide whether every object is sorted or only the top level.
  - Pick an indent of two spaces, four spaces, or tabs. The sample below shows a full sort at every depth with two spaces.
  - Press Sort, then copy the result or download it. Above 1 MB the tool waits for an explicit run instead of sorting as you type.
example:
  caption: Keys are sorted at every depth, and the large integer keeps every digit.
  input: |
    {"z": 1, "a": {"y": 2, "b": 3}, "big": 9007199254740993}
  output: |
    {
      "a": {
        "b": 3,
        "y": 2
      },
      "big": 9007199254740993,
      "z": 1
    }
mistakes:
  - Sorting a document and expecting arrays to be reordered too. Array order is meaningful, so only object keys move.
  - Comparing two files by eye after sorting at different depths. Pick the same depth and the same direction for both.
  - Assuming sorted keys change equality. Two objects with the same members in another order are already equal as JSON.
faq:
  - q: Does sorting change my values?
    a: No. Only the order of keys inside objects changes. Strings, booleans, nulls, array order, and every number token are copied as written.
  - q: What does top level only mean?
    a: It sorts the root object keys, or, when the root is an array, the keys of each object item. Objects nested deeper keep their original order.
  - q: Are large numbers preserved?
    a: Yes. The sorter works on tokens rather than parsed numbers, so 9007199254740993 and long decimals keep their exact digits.
  - q: Why is there a Run button for big files?
    a: Below 1 MB the output updates as you type. Above that, sorting on every keystroke would waste work, so the tool waits until you ask for a run.
  - q: Is sorting done on a server?
    a: No. The document is read in a Web Worker in this tab. Nothing is uploaded, and the input disappears when you close the page.
---

JSON Sorter rewrites a document so object keys appear in alphabetical order. It walks the structure and rebuilds each object with its members sorted A to Z or Z to A. Sorting happens at every depth by default, which makes two exports comparable and turns a diff into a list of real changes instead of reordered noise.

The sorter works on tokens rather than parsed values. Number text is copied exactly as written, so `9007199254740993` does not lose its last digit and a decimal with twenty places keeps all of them. Key and value content is never altered, and array order is never touched, because reordering an array changes meaning. With top level only selected, the root object keys are sorted, or, when the root is an array, the keys of each object item are sorted and deeper objects are left alone. That fits a list of records where inner objects carry a meaningful field order.

Indentation is separate from sorting. Two spaces, four spaces, or tabs are applied consistently to the output, so a sorted file also lands in the shape your repository expects.

Small inputs sort as you type. Above 1 MB the page waits for an explicit run, which keeps a large document from queueing work on every keystroke. The whole operation happens in a Web Worker, so the main thread stays free to scroll and type while a 20 MB file is rebuilt and the tab does not freeze. Nothing is uploaded and nothing is kept after the page closes.

Sorting keys is a formatting change, not a schema change. Because JSON object order carries no meaning, sorted output is a good fixture file, config snapshot, or golden test input. Direction matters less than consistency: A to Z is the usual choice, while Z to A helps when a list of keys is easier to scan backwards, such as versioned identifiers where the newest suffix should sit near the top. Whichever you pick, apply it to both files before comparing them, or the comparison will report order as a change.

If the document does not parse, the sorter reports the line and column rather than guessing. Fix the syntax with [JSON Repair](/json-repair) first, then sort.

A useful loop: sort the file, then format or minify it for its destination. Reach for [JSON Formatter](/json-formatter) when a human will read it, [JSON Minifier](/json-minifier) when bytes matter, and [JSON Diff](/json-diff) to confirm that sorting only moved keys and changed no values.
