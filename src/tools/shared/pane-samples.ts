/** Samples mirror the examples in the English tool articles. */

export const SORTER_SAMPLE = `{
  "z": 1,
  "a": { "y": 2, "b": 3 },
  "big": 9007199254740993
}`;

export const ESCAPE_SAMPLE = `He said "hello"
Path: C:\\temp`;

export const JSONPATH_SAMPLE = `{
  "store": {
    "books": [
      { "title": "A", "price": 8 },
      { "title": "B", "price": 14 }
    ]
  }
}`;

export const JSONPATH_SAMPLE_EXPRESSION = '$.store.books[?(@.price < 10)]';

export const TYPESCRIPT_SAMPLE = `{
  "id": 1,
  "name": "Ada",
  "active": true,
  "note": null,
  "tags": []
}`;

export const SCHEMA_SAMPLE = `{
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": { "type": "integer" },
    "email": { "type": "string" }
  }
}`;

export const SCHEMA_DOCUMENT_SAMPLE = `{ "id": "7" }`;
