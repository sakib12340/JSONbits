import type { JwtDecodeResult, JwtWarningCode } from '../protocol';
import { JsonFormatError } from './errors';
import { utf8Length } from './stats';

const HINT = 'Paste a three-part token: header.payload.signature. A leading Bearer prefix and line breaks are fine.';

function fail(message: string, hint = HINT): never {
  throw new JsonFormatError(message, hint, 0, 1, 1);
}

function decodeBase64Url(part: string): string {
  if (part.length === 0) return '';
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('A token segment is not valid base64url.');
  }
}

function parseSegment(text: string, name: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    fail(`The JWT ${name} is not valid JSON.`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`The JWT ${name} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

/** Decodes a JWT's header and payload. Signature verification is out of scope. */
export function decodeJwt(input: string): JwtDecodeResult {
  const started = performance.now();
  const token = input
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/\s+/g, '');

  if (token.length === 0) fail('Paste a JWT to decode.');
  const parts = token.split('.');

  if (parts.length === 5) {
    fail(
      'This is an encrypted token (JWE), not a signed JWT.',
      'Encrypted tokens have five parts and cannot be decoded without the decryption key. This tool only decodes readable header and payload segments.',
    );
  }
  if (parts.length < 2 || parts.length > 3) {
    fail('A JWT must have three dot-separated parts: header.payload.signature.');
  }
  if (parts[0].length === 0 || parts[1].length === 0) {
    fail('The header and payload segments cannot be empty.');
  }

  const header = parseSegment(decodeBase64Url(parts[0]), 'header');
  const payload = parseSegment(decodeBase64Url(parts[1]), 'payload');
  const signaturePresent = parts.length === 3 && parts[2].length > 0;

  const warnings: JwtWarningCode[] = [];
  if (header.alg === 'none') warnings.push('algNone');
  if (!signaturePresent) warnings.push('missingSignature');
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    warnings.push('expired');
  }

  const headerText = JSON.stringify(header, null, 2);
  const payloadText = JSON.stringify(payload, null, 2);

  return {
    header,
    payload,
    headerText,
    payloadText,
    signaturePresent,
    warnings,
    stats: {
      bytes: utf8Length(input),
      headerBytes: utf8Length(headerText),
      payloadBytes: utf8Length(payloadText),
      timeMs: Math.round((performance.now() - started) * 10) / 10,
    },
  };
}
