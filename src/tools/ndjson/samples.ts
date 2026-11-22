export const NDJSON_SAMPLE = [
  '{"id":1,"name":"Ada","role":"admin","active":true}',
  '{"id":2,"name":"Grace","role":"editor","active":true}',
  '{"id":3,"name":"Linus","role":"editor","active":false}',
].join('\n');

export const JSON_ARRAY_SAMPLE = JSON.stringify(
  [
    { id: 1, name: 'Ada', role: 'admin' },
    { id: 2, name: 'Grace', role: 'editor' },
  ],
  null,
  2,
);
