---
locale: en
toolId: yaml-to-json
title: YAML to JSON
description: Convert YAML to JSON in your browser. One document at a time, alias expansion capped, and precise indentation errors with line numbers. No uploads.
summary: Turn a YAML configuration file into JSON that an API, a test fixture, or another tool can consume.
steps:
  - Paste YAML or drop a .yaml file. The sample is a service configuration with nested mappings and a list.
  - Choose the JSON indentation for the output, from two spaces to tabs.
  - Press Convert or Ctrl/Cmd+Enter. Errors report the line where the YAML became ambiguous.
example:
  caption: YAML mappings become JSON objects; sequences become arrays.
  input: |
    service: checkout
    replicas: 3
    features:
      retries: true
  output: |
    {
      "service": "checkout",
      "replicas": 3,
      "features": {
        "retries": true
      }
    }
mistakes:
  - Tabs used for indentation. YAML requires spaces, and the parser reports the tab with a hint rather than guessing the structure.
  - Duplicate keys in the same mapping. The later value wins in many parsers, so the tool reports the conflict instead of hiding it.
  - Multiple documents separated by --- in one paste. Only one document is converted at a time.
  - Unquoted values such as yes or on, which older YAML parsers treat as booleans; quote them if you mean strings.
faq:
  - q: Does it convert multi-document YAML files?
    a: One document at a time. Split files joined by --- into separate inputs so each one produces a predictable JSON value.
  - q: Are YAML anchors and aliases supported?
    a: Yes, with a limit. Alias expansion is capped at 100 references to prevent a small file from expanding into an enormous structure.
  - q: Why did my indentation produce an error?
    a: YAML is indentation-sensitive and forbids tabs. The error names the line and explains whether the issue is a tab, an unexpected indent, or a duplicate key.
  - q: Does it preserve comments?
    a: No. JSON has no comment syntax, so comments are dropped during conversion. Keep the YAML file as the source of truth for comments.
  - q: Is the YAML sent to a server?
    a: No. Parsing and conversion happen in a Web Worker in this browser tab, and the result is discarded when the page closes.
---

YAML to JSON reads a configuration file and produces JSON with the same structure. Mappings become objects, sequences become arrays, and scalars keep their type: `3` becomes a number, `true` becomes a boolean, and `null` stays null. The result is indented to your preference so it can be reviewed or pasted straight into a request body.

YAML is easy to write and easy to break, so errors are reported with intent. A tab used for indentation, a duplicated key, or a value indented under the wrong parent is named at its line with a short explanation. Aliases are expanded, but expansion is capped at 100 references so a compact file cannot consume all available memory.

Only one document is converted at a time; files joined with `---` should be split first. Comments are dropped because JSON cannot represent them, which is why the YAML file should remain the source of truth. The conversion runs locally in this tab and nothing is uploaded.
