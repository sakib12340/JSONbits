export const JSON_TO_CSV_SAMPLE = `[
  {
    "name": "Ada Lovelace",
    "role": "Engineer",
    "location": { "city": "London", "country": "UK" },
    "tags": ["math", "writing"],
    "active": true
  },
  {
    "name": "Grace Hopper",
    "role": "Admiral",
    "location": { "city": "New York", "country": "US" },
    "tags": ["compilers", "navy"],
    "active": false
  },
  {
    "name": "Lin Chen",
    "role": "Designer",
    "location": { "city": "Taipei", "country": "TW" },
    "tags": ["systems", "type"],
    "active": true
  }
]`;

export const CSV_TO_JSON_SAMPLE = `name,role,city,active
Ada Lovelace,Engineer,London,true
"Hopper, Grace",Admiral,New York,true
Lin Chen,Designer,"Taipei, Taiwan",false`;

export const JSON_TO_YAML_SAMPLE = `{
  "service": "checkout",
  "replicas": 3,
  "environment": "production",
  "features": {
    "retries": true,
    "timeoutMs": 2500
  },
  "owners": ["ada", "lin"]
}`;

export const YAML_TO_JSON_SAMPLE = `service: checkout
replicas: 3
environment: production
features:
  retries: true
  timeoutMs: 2500
owners:
  - ada
  - lin`;

export const JSON_TO_XML_SAMPLE = `{
  "@version": "1.0",
  "catalog": {
    "book": [
      {
        "@id": "bk-1",
        "title": "The Analytical Engine",
        "author": "Ada Lovelace",
        "price": 12.5
      },
      {
        "@id": "bk-2",
        "title": "Notes on the Schema",
        "author": "Lin Chen",
        "price": 9.99
      }
    ]
  }
}`;

export const XML_TO_JSON_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog version="1.0">
  <book id="bk-1">
    <title>The Analytical Engine</title>
    <author>Ada Lovelace</author>
    <price currency="GBP">12.50</price>
  </book>
  <book id="bk-2">
    <title>Notes on the Schema</title>
    <author>Lin Chen</author>
    <price currency="USD">9.99</price>
  </book>
</catalog>`;
