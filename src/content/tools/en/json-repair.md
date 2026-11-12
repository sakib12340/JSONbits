---
locale: en
toolId: json-repair
title: JSON Repair
description: 'Repair invalid JSON in your browser: trailing commas, comments, single quotes, smart quotes, unquoted keys, and Python literals, with a fix list.'
summary: Fix the mechanical mistakes that break JSON and see exactly which repairs were applied before you use the result.
steps:
  - Paste the broken document or drop a file. Press Repair or Ctrl/Cmd+Enter; the sample includes several common mistakes at once.
  - Review the list of applied fixes, such as trailing commas removed or smart quotes replaced, next to the repaired output.
  - Copy or download the clean JSON, then run it through the validator to confirm the result before shipping it.
example:
  caption: The repair report names every change so nothing is fixed silently.
  input: |
    {
      name: 'JSON Bits',   // product name
      "private": True,
    }
  output: |
    {
      "name": "JSON Bits",
      "private": true
    }
mistakes:
  - Repairing a document that is missing a value or a bracket. Mechanical fixes cannot invent data, so the result still fails validation.
  - Assuming the repaired output is semantically correct. Review the fix list; a removed comment may have carried information.
  - Using repair on a document that is not JSON at all, such as a JavaScript module with imports and expressions.
faq:
  - q: Which mistakes can be repaired automatically?
    a: Comments, trailing commas, single-quoted strings, smart quotes, unquoted keys, and Python literals such as None, True, and False. Each repair is listed so you can review it.
  - q: Does repair change my data?
    a: It only rewrites syntax. Keys, values, and their order stay the same, and number tokens are preserved rather than recalculated.
  - q: Can repair fix a missing closing bracket?
    a: Not reliably. The tool repairs common punctuation and quoting mistakes; a structurally incomplete document needs a manual fix, and the validator will show where it breaks.
  - q: Should I trust the repaired output?
    a: Review the fix list first. Repairs are deterministic and shown explicitly, but removing a comment or converting True to true is a decision you should confirm.
  - q: Is the broken JSON sent to a server?
    a: No. Repair runs in a Web Worker in this tab, so invalid and valid documents alike stay on your device.
---

JSON Repair handles the mistakes that make a document invalid for boring, mechanical reasons. Comments, trailing commas, single quotes, smart quotes from a word processor, unquoted keys, and Python literals such as `True` or `None` are all rewritten into valid JSON, and every change is listed so the result is never a black box.

The repair runs in a Web Worker, so the page stays responsive even when the input is large. Number tokens are copied as text, which means a repaired document keeps its 64-bit integers and long decimals intact. The output can be copied or downloaded immediately.

Repair is a convenience, not a substitute for review. If a comment carried meaning, or a Python literal was intentional, the fix list tells you what changed so you can decide. After repairing, run the document through the JSON Validator to confirm it parses, then keep working with the formatter or viewer. Nothing is uploaded at any point.
