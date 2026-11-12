---
locale: en
slug: unexpected-token-in-json
title: 'Unexpected token in JSON: how to fix it'
description: See exactly what “unexpected token” means in JSON, the five mistakes that cause it, and how to fix each one in your browser without uploading the file.
updated: 2026-11-11
toolIds:
  - json-validator
  - json-repair
  - json-formatter
faq:
  - q: What does “unexpected token” mean?
    a: The parser reached a character it cannot accept at that position in the grammar. The token itself is usually valid JSON somewhere else, which is why the message feels vague.
  - q: Why does my JSON work in JavaScript but not in a parser?
    a: JavaScript object literals allow trailing commas, single quotes, comments, and unquoted keys. JSON allows none of those, even though the shapes look identical.
  - q: Can I fix it automatically?
    a: Mechanical problems—trailing commas, comments, single quotes, smart quotes, unquoted keys—can be repaired in one pass. A missing bracket or value needs a manual fix.
---

“Unexpected token” is the least helpful error message in JSON, and also the most common. It does not name the mistake; it names the character where the parser gave up. Once you know the five usual causes, the message becomes a precise pointer rather than a riddle.

## What the error actually means

A JSON parser reads the document one token at a time. When it meets a character that cannot follow what came before, it stops and reports that position. A comma in the wrong place, a quote it did not expect, or a letter where a value should start all produce the same headline.

The position matters more than the wording. The real mistake is often one character before the reported token, because the parser only notices the problem after accepting what came before it.

## The five usual causes

**A trailing comma.** `{"a": 1,}` is valid JavaScript and invalid JSON. The comma must sit between members, never after the last one.

**Comments.** Neither `// note` nor `/* note */` exists in the JSON grammar. Anything copied from a config file with comments has to lose them.

**Single quotes.** `{'a': 1}` fails immediately. JSON strings and keys require double quotes.

**Unquoted keys.** `{a: 1}` is a JavaScript object literal. The key needs quotes: `{"a": 1}`.

**Smart quotes.** A word processor turns `"` into `“` and `”`. They look correct on screen and are a different character to the parser.

Less common causes include a missing comma between members, a missing closing bracket, the word `undefined`, and Python values such as `True`, `False`, or `None`.

## Finding the exact spot

A validator that reports line and column turns the hunt into a single step. Paste the document into the JSON Validator, and read the excerpt around the reported position. If the character is a closing brace, look at the character before it: that comma is usually the problem. If it is a letter, check whether a value is missing an opening quote.

For a document with several mistakes, fix the first error and validate again. Parsers stop at the first failure, so the second error only appears after the first is gone.

## Fixing it without guesswork

Mechanical mistakes can be repaired in one pass. The JSON Repair tool rewrites trailing commas, comments, single quotes, smart quotes, unquoted keys, and Python literals, and lists every change it made so nothing is hidden. Review the list, then validate the result.

Structural mistakes need a human. A missing bracket, a truncated file, or a value that never existed cannot be inferred safely. In those cases the validator's position tells you where the structure stopped making sense, and the formatter helps you see the surrounding indentation once the shape is correct.

## Keep it from happening again

Generate JSON with a serialiser rather than by hand, keep comments in the source format rather than in the JSON, and paste through a plain-text editor if a document has travelled through a word processor. If a file must carry comments, JSON5 or YAML is a better fit than JSON.

Every step above can be done in this browser. The validator, repair tool, and formatter run locally in a Web Worker, so a document from a customer or a production export never leaves your device.
