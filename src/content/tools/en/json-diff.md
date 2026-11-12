---
locale: en
toolId: json-diff
title: JSON Diff
description: Compare two JSON documents in your browser and see every added, removed, and changed value as a flat list you can filter by path. Nothing uploaded.
summary: Compare two JSON documents structurally and review the differences as a readable list of paths instead of two walls of text.
steps:
  - Paste the original document on the left and the changed document on the right, or open each one from a file.
  - Press Compare or Ctrl/Cmd+Enter. Identical documents say so immediately; otherwise every difference is listed with its path.
  - Filter by added, removed, or changed, copy a path, or turn on Ignore array order when the same items were reordered.
example:
  caption: A structural diff reports the path and both values for each change.
  input: |
    Original: { "name": "JSON Bits", "version": 1 }
    Changed:  { "name": "JSON Bits", "version": 2, "private": true }
  output: |
    changed  $.version   1 → 2
    added    $.private   true
mistakes:
  - Comparing text rather than data. Key order and indentation do not matter here, so a reformatted file reports no changes.
  - Using Ignore array order when positions are meaningful. Reordered list items are then treated as the same values.
  - Comparing documents that fail to parse. Fix the syntax first; the error names the line and column.
faq:
  - q: Is the comparison textual or structural?
    a: Structural. Both documents are parsed and compared by path, so indentation, whitespace, and key order never show up as differences.
  - q: What does Ignore array order do?
    a: It matches array items by value instead of position, so moving an item within a list is not reported as a removal and an addition.
  - q: How large can the two documents be?
    a: Each document can be up to 20 MB. Larger inputs are rejected with a clear message rather than risking a frozen tab.
  - q: Are my documents uploaded to compare them?
    a: No. Both documents are parsed and diffed in a Web Worker in this tab. There is no server call and nothing is stored after the tab closes.
  - q: Does the diff show both old and new values?
    a: Yes. Changed rows show the previous and current value side by side, and added or removed rows show the value that appeared or disappeared.
---

The JSON Diff tool compares two documents by structure, not by text. Both inputs are parsed in a Web Worker, walked together, and reduced to a flat list of paths with a type: added, removed, or changed. Because the comparison happens after parsing, reformatting a file, reordering keys, or changing indentation never produces a false difference.

Each row carries the JSONPath of the change, the old value, and the new value where both exist. Filters narrow the list to a single kind of change, and a path can be copied for a bug report or a test. The Ignore array order option matches list items by value instead of position, which is what you want when an API returns the same collection in a different order.

The diff runs entirely in this browser tab. Documents are never uploaded, never written to storage, and are discarded when you close the page. Each side accepts files up to 20 MB, and identical documents are reported as identical instead of producing an empty list.
