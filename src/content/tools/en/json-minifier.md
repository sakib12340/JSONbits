---
locale: en
toolId: json-minifier
title: JSON Minifier
description: Minify JSON by removing whitespace without touching values or number precision. See how many bytes you save, then copy or download the result.
summary: Strip insignificant whitespace from JSON and see exactly how much smaller the document becomes.
steps:
  - Paste or drop the JSON you want to compress. The sample shows a formatted document with nested objects and arrays.
  - Press Minify or Ctrl/Cmd+Enter. The stats bar reports the input size, the output size, and the percentage saved.
  - Copy the compact result or download it as minified.json for a config file, an API payload, or a bundle.
example:
  caption: The same document after minification, with the size reduction reported above the output.
  input: |
    {
      "name": "JSON Bits",
      "tags": ["json", "minify"],
      "private": true
    }
  output: '{"name":"JSON Bits","tags":["json","minify"],"private":true}'
mistakes:
  - Minifying invalid JSON produces an error instead of output. Run the validator or the repair tool first.
  - Removing whitespace inside a string would corrupt the value, so the minifier only removes whitespace between tokens.
  - Reformatting later restores readability, but the compact form is what a production server or bundle should ship.
faq:
  - q: Does minifying change my values?
    a: No. Only whitespace between tokens is removed. Strings, keys, number tokens, and their order stay exactly as written, including big integers and long decimals.
  - q: How much space does minification save?
    a: It depends on indentation. Pretty-printed JSON with two-space indents often shrinks by 20–40 percent, while already compact input saves little or nothing.
  - q: Is the minified JSON still valid?
    a: Yes, if the input was valid. The output is the same document with insignificant whitespace removed, so every parser reads it identically.
  - q: Can I minify a file rather than pasted text?
    a: Yes. Drop a .json file on the page or use Open file. Large files are processed in the background worker and the result can be downloaded directly.
  - q: Why does the page warn above 50 MB?
    a: Very large documents can exhaust memory in the tab. The warning lets you decide before starting a run that might take a few seconds.
---

The JSON Minifier removes the whitespace that makes JSON readable but costs bytes: indentation, line breaks, and spaces around punctuation. It parses the document safely and re-emits it without those characters, so the result is byte-for-byte equivalent JSON that any parser reads the same way.

Number handling is deliberate. Instead of parsing into JavaScript numbers and serialising them again, the minifier keeps number tokens as text, so `9007199254740993` does not become `9007199254740992` and `4.999999999999999` keeps every digit. Strings are never touched, which means whitespace inside a value survives while whitespace between tokens does not.

The stats bar shows the before and after size plus the percentage saved, which is useful when you are checking whether a payload is worth compressing or whether gzip already does the work. Everything runs in this tab. Your JSON is not uploaded, stored, or logged, and the download is generated locally from the result.
