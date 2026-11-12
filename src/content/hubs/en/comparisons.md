---
locale: en
category: compare
description: Compare two JSON documents in your browser and see added, removed, and changed values by path. No uploads, no accounts, and nothing is ever stored.
faq:
  - q: Is the diff textual or structural?
    a: Structural. Both documents are parsed first, so indentation, whitespace, and key order never appear as differences.
  - q: How large can each document be?
    a: Each side accepts a document up to 20 MB. Larger inputs are rejected with a clear message rather than risking a frozen tab.
  - q: Can I ignore the order of array items?
    a: Yes. Enable Ignore array order when a list contains the same values in a different order and you do not want those moves reported.
---

Comparison tools answer the question that comes up after a deploy, a config change, or an API upgrade: what actually changed? Comparing two files in a text editor answers a different question, because reformatting and key reordering produce noise that hides the real difference.

The JSON Diff tool parses both documents, walks them together, and produces a flat list of paths with a change type: added, removed, or changed. Each row shows the path and the values involved, so `$.features.retries` is directly actionable rather than something to hunt for in a wall of text. Filters narrow the list to one kind of change, and paths can be copied.

Because the comparison happens after parsing, key order, indentation, and whitespace never register. The Ignore array order option handles the other common false positive: the same items returned in a different order. Both documents are parsed in a Web Worker, never uploaded, and discarded when the page closes.
