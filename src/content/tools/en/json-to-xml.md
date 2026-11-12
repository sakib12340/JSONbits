---
locale: en
toolId: json-to-xml
title: JSON to XML
description: Convert JSON to XML in your browser. Set the root element, turn @ keys into attributes, and control indentation. Nothing leaves your device.
summary: Turn a JSON object into an XML document with a chosen root element, attributes, and readable indentation.
steps:
  - Paste a JSON object or drop a file. The sample is a product record with nested fields and an identifier.
  - Set the root element name, choose the indent, and decide whether keys beginning with @ become attributes.
  - Press Convert or Ctrl/Cmd+Enter, then copy the XML or download it as a .xml file.
example:
  caption: The @id key becomes an attribute when attribute support is on.
  input: |
    { "product": { "@id": "p-1", "name": "Keyboard", "price": 79 } }
  output: |
    <?xml version="1.0" encoding="UTF-8"?>
    <root>
      <product id="p-1">
        <name>Keyboard</name>
        <price>79</price>
      </product>
    </root>
mistakes:
  - Element names that start with a digit or contain spaces. XML names have stricter rules than JSON keys, so invalid names are rejected with a message.
  - Expecting an array to become repeated elements with a meaningful name. Top-level arrays are wrapped in item elements because JSON has no tag names for them.
  - Forgetting that XML has no null. Null values become empty elements, which is a lossy mapping worth checking on the receiving side.
faq:
  - q: How are attributes represented in JSON?
    a: A key that starts with @ becomes an attribute when the option is enabled, so @id turns into id="…". The @ prefix is a convention, not part of the XML name.
  - q: What happens to arrays?
    a: Each array entry becomes a child element. Repeated object keys keep their name, and unnamed top-level entries are wrapped in item elements.
  - q: Can I choose the root element?
    a: Yes. Enter any valid XML name in the root field; it defaults to root and is validated before conversion.
  - q: Is the XML escaped safely?
    a: Yes. Ampersands, angle brackets, quotes, and apostrophes are escaped in text and attribute values, so the document parses correctly.
  - q: Are number and boolean values preserved?
    a: They are written as text, because XML has no native number or boolean type. The values are not rounded or reformatted.
  - q: Is my JSON uploaded?
    a: No. The conversion runs in a Web Worker in this browser tab and the download is generated locally.
---

JSON to XML maps a data model onto a markup model, which is never a perfect translation, so the choices are explicit. The root element is named by you, keys become child elements, and a key beginning with `@` becomes an attribute when that option is enabled. Arrays become repeated child elements, with `item` used as the tag name when JSON provides no name of its own.

Values are written as text. JSON numbers and booleans have no XML equivalents, so `79` stays `79` and `true` stays `true` without reformatting. Null becomes an empty element, which is the closest XML can express; if the receiving system distinguishes null from an empty string, check that mapping before relying on it.

XML is stricter about names than JSON, so element and attribute names are validated before output: a key with spaces or a leading digit produces a clear error instead of malformed XML. Text and attribute values are escaped so ampersands and angle brackets survive the round trip. Everything happens in this tab; nothing is uploaded or stored.
