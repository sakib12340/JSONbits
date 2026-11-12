---
locale: en
toolId: xml-to-json
title: XML to JSON
description: Convert XML to JSON in your browser. Attributes become @ keys, repeated elements become arrays, and values stay exactly as written. Nothing uploaded.
summary: Turn an XML document into JSON while keeping element names, attributes, and repeated children intact.
steps:
  - Paste XML or drop a .xml file. The sample is a feed with repeated item elements and an attribute.
  - Choose the JSON indentation and whether attributes should be kept as @-prefixed keys.
  - Press Convert or Ctrl/Cmd+Enter, then copy the JSON or download it as a .json file.
example:
  caption: Repeated elements become an array; attributes are prefixed with @.
  input: |
    <feed>
      <item id="1">First</item>
      <item id="2">Second</item>
    </feed>
  output: |
    {
      "feed": {
        "item": [
          { "@id": "1", "#text": "First" },
          { "@id": "2", "#text": "Second" }
        ]
      }
    }
mistakes:
  - Expecting numeric-looking text to become a number. Values stay strings because XML does not carry JSON types.
  - A mismatched closing tag, which the validator reports with the line and column of the offending element.
  - Turning attributes off and then wondering where an identifier went; with the option off, attributes are dropped.
  - 'Mixed content (text around child elements) landing under a #text key instead of where you expected it.'
faq:
  - q: Why are all values strings?
    a: XML has no number or boolean type, so 12.50 could be a price or a string. Keeping the original text avoids silently changing a value like 01234.
  - q: How are attributes represented?
    a: 'With attributes enabled, each one becomes a key prefixed with @, so id="1" appears as "@id": "1". Disable the option to omit them.'
  - q: What about repeated elements?
    a: Siblings with the same tag are collected into an array, which is the natural JSON representation of repeated XML elements.
  - q: 'What is #text used for?'
    a: 'When an element has both attributes and text, the text is stored under #text so the attributes can sit alongside it without a collision.'
  - q: Does it validate the XML first?
    a: Yes. Structure is validated before parsing, and a mismatched closing tag or bad attribute is reported with a line and column and a short hint.
  - q: Is my XML uploaded?
    a: No. Parsing and conversion happen in a Web Worker in this browser tab, and nothing is stored after the page closes.
---

XML to JSON converts a markup document into a data structure. Element names become keys, repeated sibling elements become arrays, and attributes become `@`-prefixed properties when that option is enabled. A document small enough to read fits easily on one screen.

Values are kept as strings on purpose. XML does not distinguish `"12.50"` from `12.5`, so converting numeric-looking text would quietly change data such as a price, a version, or a postal code with a leading zero. Keeping the text exactly as written means the JSON is faithful to the source and type decisions stay with you.

Mixed content is the one shape that needs care: when an element holds both text and child elements, the text appears under `#text` so it cannot collide with a child of the same name. The document is validated before parsing, and a mismatched tag is reported with line and column instead of a generic failure. Everything runs locally; no upload, no account, no stored data.
