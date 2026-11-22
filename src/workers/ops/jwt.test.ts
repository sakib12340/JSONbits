import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt';
import { JsonFormatError } from './errors';

function token(header: object, payload: object, signature = 'signature'): string {
  const b64 = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${b64(header)}.${b64(payload)}.${signature}`;
}

describe('JWT decoder', () => {
  it('decodes header and payload and surfaces common claims', () => {
    const jwt = token(
      { alg: 'HS256', typ: 'JWT', kid: 'key-1' },
      { iss: 'https://example.com', sub: 'ada', exp: 4102444800, iat: 1700000000 },
    );
    const result = decodeJwt(`Bearer ${jwt}`);

    expect(result.header.alg).toBe('HS256');
    expect(result.payload.sub).toBe('ada');
    expect(result.signaturePresent).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.headerText).toContain('"alg": "HS256"');
  });

  it('accepts whitespace and line breaks', () => {
    const jwt = token({ alg: 'HS256' }, { sub: 'ada' });
    expect(decodeJwt(`  Bearer ${jwt.slice(0, 20)}\n${jwt.slice(20)}  `).payload.sub).toBe('ada');
  });

  it('warns about alg none, missing signature, and expiry', () => {
    const jwt = token({ alg: 'none' }, { exp: 1 }, '');
    const result = decodeJwt(jwt);
    expect(result.warnings).toContain('algNone');
    expect(result.warnings).toContain('missingSignature');
    expect(result.warnings).toContain('expired');
    expect(result.signaturePresent).toBe(false);
  });

  it('rejects encrypted five-part tokens', () => {
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(JsonFormatError);
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(/encrypted/i);
  });

  it('rejects malformed segments', () => {
    expect(() => decodeJwt('notbase64!.payload.sig')).toThrow(/base64url/i);
    expect(() => decodeJwt(`${Buffer.from('[]').toString('base64url')}.e30.sig`)).toThrow(
      /must be a JSON object/i,
    );
  });
});
