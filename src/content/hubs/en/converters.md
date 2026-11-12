---
locale: en
category: convert
description: Convert JSON to CSV, YAML, and XML in your browser, and convert each format back. No uploads, no accounts, and no data ever leaves your device.
faq:
  - q: Are conversions lossless?
    a: JSON to CSV and XML are inherently lossy in places, because neither format carries JSON types. Each tool explains the mapping it uses, such as arrays joined into a CSV cell or values kept as strings.
  - q: Which libraries run in the browser?
    a: CSV parsing uses Papa Parse, YAML uses the yaml package, and XML uses fast-xml-parser. Each one is loaded lazily inside the Web Worker only when that tool runs.
  - q: Can I convert a file rather than pasted text?
    a: Yes. Every converter accepts drag-and-drop or Open file, and produces a download with the correct MIME type and extension.
---

Converters move data between JSON and the formats around it: CSV for spreadsheets, YAML for configuration, and XML for older APIs and feeds. All six conversions run in this browser tab, so a file from a customer or a production export never has to be uploaded to a third-party service.

The CSV tools handle the details that break naive conversions: nested objects become dot-path columns, fields containing delimiters or quotes are quoted per RFC 4180, and a spreadsheet formula guard prevents a cell from executing. The YAML tools keep long strings on one line and cap alias expansion. The XML tools map `@` keys to attributes, keep values as strings, and validate element names.

Each converter states its mapping rather than guessing silently, because these formats do not share a type system. JSON numbers and booleans become text in XML, arrays become joined cells or JSON in CSV, and YAML comments are dropped. Conversion happens in a Web Worker; the result can be copied or downloaded, and nothing is stored after the page closes.
