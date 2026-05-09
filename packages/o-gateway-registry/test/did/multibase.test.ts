import { decodeEd25519PublicKey } from '../../src/did/multibase.js';
import { generateTestKey } from './test-keys.js';

describe('decodeEd25519PublicKey', () => {
  test('round-trips a freshly-generated Ed25519 key', () => {
    const key = generateTestKey();
    const decoded = decodeEd25519PublicKey(key.publicKeyMultibase);
    expect(decoded.length).toBe(32);
    expect(Buffer.from(decoded).equals(Buffer.from(key.rawPublic))).toBe(true);
  });

  test('rejects a multibase value without the "z" prefix', () => {
    expect(() => decodeEd25519PublicKey('xABC')).toThrow(/multibase base58btc prefix/);
  });

  test('rejects a multibase value whose multicodec header is wrong', () => {
    // base58btc-encode something with a non-Ed25519 multicodec prefix.
    // Here we just feed an obviously-invalid string.
    expect(() => decodeEd25519PublicKey('z11111')).toThrow(
      /Ed25519-pub multicodec/,
    );
  });

  test('rejects empty input', () => {
    expect(() => decodeEd25519PublicKey('')).toThrow(/multibase base58btc prefix/);
  });
});
