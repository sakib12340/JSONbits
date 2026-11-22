import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';

const root = process.cwd();
const locales = ['en', 'es', 'fr', 'de', 'pt'];
const errors = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);

function fail(msg) {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

// 1. Locale key parity
console.log('Locale key parity');
const dict = {};
for (const locale of locales) {
  dict[locale] = JSON.parse(readFileSync(join(root, 'src/i18n/locales', `${locale}.json`), 'utf8'));
}
const baseKeys = Object.keys(dict.en).sort();
for (const locale of locales.filter((l) => l !== 'en')) {
  const keys = Object.keys(dict[locale]).sort();
  const missing = baseKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !baseKeys.includes(k));
  if (missing.length) fail(`${locale}: missing ${missing.length} keys (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''})`);
  if (extra.length) fail(`${locale}: extra ${extra.length} keys`);
  if (!missing.length && !extra.length) ok(`${locale}: ${keys.length} keys match en`);
}

// 2. Title length (static metaTitle strings + guide titles + tool names)
console.log('Title length (≤60)');
const en = dict.en;
for (const [key, value] of Object.entries(en)) {
  if (key.endsWith('metaTitle')) {
    if (value.length > 60) fail(`${key}: ${value.length} chars — "${value}"`);
  }
}
// guide titles
const guidesDir = join(root, 'src/content/guides/en');
if (existsSync(guidesDir)) {
  for (const file of readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(join(guidesDir, file), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    const fm = m ? parseYaml(m[1]) : {};
    const title = `${fm.title} | JSON Bits`;
    if (title.length > 60) fail(`guide ${file}: title ${title.length} chars — "${title}"`);
  }
}
// tool names from registry
const registry = readFileSync(join(root, 'src/tools/registry.ts'), 'utf8');
const nameMatches = [...registry.matchAll(/name:\s*'([^']+)'/g)];
for (const m of nameMatches) {
  const name = m[1];
  const title = `${name} Online — Free & Private | JSON Bits`;
  if (title.length > 60) fail(`tool "${name}": title ${title.length} chars — "${title}"`);
}
ok('title checks done');

// 3. Description length (140–155) in content collections
console.log('Description length (140–155)');
for (const collection of ['tools', 'hubs', 'guides']) {
  const base = join(root, 'src/content', collection);
  if (!existsSync(base)) continue;
  for (const locale of locales) {
    const dir = join(base, locale);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const raw = readFileSync(join(dir, file), 'utf8');
      const m = raw.match(/^---\n([\s\S]*?)\n---/);
      const fm = m ? parseYaml(m[1]) : {};
      const desc = fm.description;
      if (typeof desc === 'string') {
        if (desc.length < 140 || desc.length > 155) {
          fail(`${collection}/${locale}/${file}: description ${desc.length} chars`);
        }
      }
    }
  }
}
// UI string descriptions
for (const key of ['home.metaDescription', 'learn.description']) {
  const v = en[key];
  if (typeof v === 'string' && (v.length < 140 || v.length > 155)) {
    fail(`${key}: ${v.length} chars`);
  }
}
// Privacy page description (hardcoded)
const privacyDesc = 'What JSON Bits stores, what it never sees, and why every tool works without sending your JSON anywhere. A plain summary of local processing.';
if (privacyDesc.length < 140 || privacyDesc.length > 155) fail(`privacy description: ${privacyDesc.length} chars`);
ok('description checks done');

// 4. CSP inline-script hash vs built output
console.log('CSP inline-script hash');
const distIndex = join(root, 'dist/index.html');
const headersFile = existsSync(join(root, 'dist/_headers')) ? join(root, 'dist/_headers') : join(root, 'public/_headers');
if (!existsSync(distIndex)) {
  console.log('  (skip: dist/index.html not found — run pnpm build first)');
} else {
  const html = readFileSync(distIndex, 'utf8');
  const scriptMatch = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    fail('could not find inline theme script in dist/index.html');
  } else {
    const hash = createHash('sha256').update(scriptMatch[1], 'utf8').digest('base64');
    const computed = `sha256-${hash}`;
    const headers = readFileSync(headersFile, 'utf8');
    const m = headers.match(/sha256-[A-Za-z0-9+/=]+/);
    const pinned = m ? m[0] : null;
    if (!pinned) fail('no sha256 hash found in _headers');
    else if (pinned !== computed) fail(`CSP hash mismatch: pinned ${pinned}, computed ${computed}`);
    else ok(`CSP hash matches (${computed})`);
  }
}

console.log('');
if (errors.length) {
  console.error(`Validation failed: ${errors.length} issue(s).`);
  process.exit(1);
} else {
  console.log('All checks passed.');
}