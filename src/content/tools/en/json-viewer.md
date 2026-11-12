---
locale: en
toolId: json-viewer
title: JSON Viewer
description: Explore large JSON as a fast, virtualized tree in your browser. Search keys and values, copy JSONPath paths, and expand only what you need. No uploads.
summary: Read a large JSON document as a tree with lazy expansion, search, and copyable paths instead of a wall of text.
steps:
  - Paste JSON or drop a file, then press View tree or Ctrl/Cmd+Enter. The sample loads a nested document with arrays, objects, and mixed values.
  - Expand rows with the arrow keys or a click. Expand to depth opens several levels at once; Collapse all returns to the root.
  - Use Search to find keys or values, then copy a JSONPath path or the value of the selected row.
example:
  caption: One row per node, with type badges, child counts, and the JSONPath of the selection.
  input: |
    {
      "team": [
        { "name": "Ada", "role": "engineer" },
        { "name": "Grace", "role": "admiral" }
      ]
    }
  output: |
    team                 array (2)
      0                  object (2)
        name             "Ada"
        role             "engineer"
      1                  object (2)
mistakes:
  - Pasting JSON with a trailing comma stops the tree from building; the error points at the exact line.
  - Expecting every node to render at once. Large documents expand lazily, so collapsed branches are not in the DOM.
  - Copying a value that is still collapsed. Expand the node first, or copy the path and inspect it elsewhere.
faq:
  - q: How large a document can the viewer open?
    a: Files up to 100 MB are accepted. The tree is virtualized and fetched in slices from the worker, so only visible rows exist in the page at any time.
  - q: Does the viewer freeze on big files?
    a: No. Parsing and indexing happen in a Web Worker, and the result is rendered as a virtualized list, so scrolling stays responsive instead of blocking the main thread.
  - q: What format do copied paths use?
    a: Paths are JSONPath expressions such as $.team[0].name, ready to paste into a query tool, a test, or documentation.
  - q: Can I search values as well as keys?
    a: Yes. Search matches keys and scalar values, reports how many matches were found, and lets you jump between them.
  - q: Does the viewer upload or store my JSON?
    a: No. The document is parsed in your browser and discarded when the tab closes. Nothing is sent to a server and nothing is written to storage.
---

The JSON Viewer presents a document as a tree of rows rather than a block of text. Each row shows a key, its type, and a preview of the value, with a count for objects and arrays. Branches open on demand, so a document with tens of thousands of nodes still renders instantly and stays responsive while you scroll.

The tree is built in a Web Worker and served to the page in slices. That architecture keeps the main thread free: the page holds only the rows currently visible, not the whole document. Search runs in the same worker and matches both keys and scalar values, returning a match count and a way to step through results.

Paths are shown as JSONPath, for example `$.team[0].name`, and can be copied with one action, along with the value itself. That makes the viewer useful for debugging an API response, checking which field changed, or handing a precise path to a colleague. Everything stays on your device: no upload, no account, and no stored document.
