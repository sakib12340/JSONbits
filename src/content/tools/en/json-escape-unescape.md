---
locale: en
toolId: json-escape-unescape
title: JSON Escape / Unescape
description: 'Escape or unescape JSON strings: quotes, backslashes, newlines, control characters, and \uXXXX sequences. Runs in your browser, nothing uploaded.'
summary: Turn arbitrary text into a valid JSON string body, or read an escaped string back into plain text, with line and column errors.
steps:
  - Paste text or drop a file. Escape is the default mode, so any text becomes a JSON string body; Unescape reverses the process.
  - Enable Wrap in quotes to get a complete JSON string, and Escape non-ASCII to write every non-ASCII character as \uXXXX.
  - Press Escape or Unescape, then copy the result or download it as a .txt file for a log, a script, or a ticket.
example:
  caption: Escape writes quotes, backslashes, and the newline as JSON escapes, and the optional quotes wrap the whole string.
  input: |
    He said "hello"
    Path: C:\temp
  output: |
    "He said \"hello\"\nPath: C:\\temp"
mistakes:
  - Unescaping a Windows path. A sequence such as \t is read as a tab, so double the backslash before unescaping if the text is literal.
  - Pasting a whole JSON object into Unescape. The tool reverses escape sequences and strips wrapping quotes; it does not parse documents.
  - Turning on Escape non-ASCII and expecting readable output. Every accented or non-Latin character becomes a \uXXXX sequence.
  - Sending unescaped text into a JSON string. A raw quote or newline breaks the string, while the escaped form stays valid.
faq:
  - q: Does this only work on valid JSON?
    a: No. Both modes accept arbitrary text, including a fragment, a log line, a SQL statement, or a path. It does not have to parse as JSON.
  - q: Which escapes are recognised?
    a: Unescape handles \\, \", \/, \b, \f, \n, \r, \t, and \uXXXX, and strips surrounding quotes when they are present.
  - q: What happens with an invalid escape?
    a: A sequence such as \q is reported with its line and column, and the valid escapes are listed so you can correct it without guessing.
  - q: When should I escape non-ASCII characters?
    a: When the receiving system expects pure ASCII, for example a payload that must survive a narrow transport or a source file with a restricted encoding.
  - q: Is my text sent anywhere?
    a: No. Escaping runs in a Web Worker in this tab, so the text never leaves the device and nothing is stored after the page closes.
---

JSON escaping is the difference between text that can travel inside a JSON string and text that breaks the document. A quote ends a string early, a backslash starts an escape, and a literal newline is not allowed inside a JSON string at all. The JSON Escape / Unescape tool converts between the readable form and the escaped form without requiring the input to be valid JSON.

Escape mode takes any text and produces a string body: quotes become `\"`, backslashes become `\\`, newlines become `\n`, tabs become `\t`, and the remaining control characters are written as escapes. Two options refine the result. Wrap in quotes adds the surrounding double quotes so the output is a complete JSON string ready to paste into a config file or a test fixture. Escape non-ASCII writes every character outside ASCII as a `\uXXXX` sequence, which is what a system that only accepts ASCII needs.

Unescape mode goes the other way. It resolves `\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX`, and removes surrounding quotes when they are there. That second detail matters when a value arrives double encoded: paste the string, unescape once, and you see what the producer meant. An invalid escape such as `\q` is not silently dropped. The tool reports the line and column and lists the escapes it accepts, so a malformed log line or hand-edited config can be fixed directly.

The awkward cases are usually double encoded. A JSON document stored inside another JSON document arrives with two layers of backslashes, and reading it by eye is close to impossible. Unescape once to remove the outer layer, check the result, and unescape again only if the value is still escaped. If the middle step turns out to be a whole document rather than a string, stop there and open it in the formatter.

Because escaping is a text operation, it runs fast on long single-line payloads, including a 5 MB JSON string copied out of a database. The work happens in a Web Worker, so the page keeps responding, and the result can be copied or downloaded as a `.txt` file. Nothing is uploaded, and the text is not written to storage.

Use it when embedding a query or a template in JSON, when reading an escaped value from a log, or when preparing a payload for a system with a narrow character set. For documents rather than snippets, [JSON Formatter](/json-formatter) and [JSON Validator](/json-validator) are the better fit, and [JSON Repair](/json-repair) handles syntax that is broken for other reasons.
