---
locale: en
toolId: json-to-yaml
title: JSON to YAML
description: Convert JSON to YAML in your browser with 2-space or 4-space indentation. Long strings stay on one line, and nothing is ever uploaded or stored.
summary: Turn a JSON document into readable YAML for configuration files, CI pipelines, and Kubernetes manifests.
steps:
  - Paste JSON or drop a .json file. The sample is a small service configuration with nested objects and booleans.
  - Choose two-space or four-space indentation to match the file you are editing.
  - Press Convert or Ctrl/Cmd+Enter, then copy the YAML or download it as a .yaml file.
example:
  caption: JSON keys become YAML mappings; indentation follows the selected option.
  input: |
    { "service": "checkout", "replicas": 3, "features": { "retries": true } }
  output: |
    service: checkout
    replicas: 3
    features:
      retries: true
mistakes:
  - Mixing tabs and spaces in the output before pasting it into a YAML file. YAML forbids tabs for indentation.
  - Assuming every JSON document maps to clean YAML. Keys containing colons or leading symbols are quoted automatically, which can look unexpected.
  - Editing the YAML by hand and losing indentation, which changes the structure rather than just the formatting.
faq:
  - q: Does the converter wrap long strings?
    a: No. Line width is disabled, so a long URL or message stays on one line instead of being folded across several, which keeps diffs stable.
  - q: Is the YAML valid for Kubernetes and CI files?
    a: Yes. The output is standard YAML, with quoting applied only where a plain scalar would be ambiguous.
  - q: What happens to JSON null, numbers, and booleans?
    a: 'They map to their YAML equivalents: null, numbers without quotes, and true or false. Strings that look like numbers are quoted to keep them strings.'
  - q: Can I convert a large JSON file to YAML?
    a: Yes. Files up to 100 MB are accepted, and the conversion runs in a Web Worker so the page stays responsive while it works.
  - q: Is my JSON uploaded when converting?
    a: No. The conversion happens entirely in this browser tab, and the YAML file is generated locally when you press download.
---

JSON to YAML converts a data document into the indentation-based format used by Docker Compose, Kubernetes, GitHub Actions, and most application config files. Keys become mappings, arrays become sequences, and values keep their type: numbers stay numbers, `null` stays `null`, and booleans stay booleans.

The converter is tuned for files people read and review. Long strings are never wrapped, because a folded URL or error message makes a diff noisy and can break a copied value. Indentation is 2 or 4 spaces to match the project you are editing, and quoting is added only where YAML would otherwise misread a scalar, such as a string that looks like a number or contains a colon followed by a space.

Output downloads as `application/yaml` with a `.yaml` extension. The conversion runs in a Web Worker in this tab: no upload, no server, and no stored document. If the JSON is invalid, the error points at the line and column before any YAML is produced.
