---
locale: en
category: format
description: Format, minify, and repair JSON in your browser. Compare the three formatting tools and pick the one that fits the job. Nothing is uploaded.
faq:
  - q: Which formatter tool should I start with?
    a: Use JSON Formatter for readable output, JSON Minifier when you need the smallest possible payload, and JSON Repair when the document does not parse at all.
  - q: Do these tools change my data?
    a: No. Formatting and minification only change whitespace, and repair only rewrites syntax. Number tokens are copied as text, so big integers keep their digits.
  - q: Can I format a large file?
    a: Yes. Files up to 100 MB are accepted, and large documents run in a background worker with a progress state instead of freezing the page.
---

Formatting tools change how JSON looks, not what it means. The three tools in this group cover the jobs that come up constantly: making a compact API response readable, shrinking a document before it ships, and rescuing a file that a parser rejects.

**JSON Formatter** is the everyday tool. It indents with two spaces, four spaces, or tabs, reports syntax errors with a line and column, and preserves number tokens exactly, so a 64-bit identifier does not silently lose precision. **JSON Minifier** removes the whitespace again and reports how many bytes were saved, which is useful when you are checking the cost of a payload. **JSON Repair** handles the mechanical mistakes: comments, trailing commas, single quotes, smart quotes, unquoted keys, and Python literals such as `True`.

All three run in a Web Worker inside your browser. There is no upload step and no server that could receive the document, so it is safe to paste production data or a file from a customer. If a tool cannot finish, the page reports why and keeps the tab alive.
