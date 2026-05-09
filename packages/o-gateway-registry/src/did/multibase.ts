/**
 * base58btc codec for the multibase prefix `z`.
 *
 * `Ed25519VerificationKey2020` per the DID Core spec encodes the public
 * key as multibase base58btc (`z` prefix) of the multicodec envelope
 * (`0xed01` for Ed25519-pub) followed by the 32-byte raw key. We strip
 * the prefix, decode base58btc, validate the multicodec header, and
 * return the 32-byte key.
 *
 * Implementation note: we inline a small, well-tested base58btc
 * algorithm (the standard "iterative big-int" variant used by
 * Bitcoin Core, bs58, and multiformats) rather than pulling a
 * dependency. This is the only multibase encoding v0 needs and the
 * codec is ~50 lines. v1 can reach for `multiformats` if more
 * encodings show up.
 */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < BASE58_ALPHABET.length; i += 1) {
    map[BASE58_ALPHABET[i]] = i;
  }
  return map;
})();

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  // Count leading zero bytes — each becomes a leading '1' in the output.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;

  // Working buffer, treated as a big-endian big integer in base 58.
  // size = ceil(input * log(256) / log(58)) ≈ ceil(input * 138 / 100).
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i += 1) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j += 1) {
      const x = digits[j] * 256 + carry;
      digits[j] = x % 58;
      carry = Math.floor(x / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = '';
  for (let i = 0; i < zeros; i += 1) out += '1';
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += BASE58_ALPHABET[digits[i]];
  }
  return out;
}

export function base58Decode(s: string): Uint8Array {
  if (s.length === 0) return new Uint8Array(0);
  // Count leading '1' chars — each represents a leading zero byte.
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros += 1;

  const bytes: number[] = [];
  for (let i = zeros; i < s.length; i += 1) {
    const ch = s[i];
    const value = BASE58_INDEX[ch];
    if (value === undefined) {
      throw new Error(`base58: invalid character "${ch}"`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j += 1) {
      const x = bytes[j] * 58 + carry;
      bytes[j] = x & 0xff;
      carry = x >>> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry = carry >>> 8;
    }
  }
  // bytes is little-endian; reverse it and prepend the leading-zero count.
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[zeros + i] = bytes[bytes.length - 1 - i];
  }
  return out;
}

/**
 * Decodes a `publicKeyMultibase` string for an Ed25519 key into the
 * 32-byte raw public key. Throws if the prefix, multicodec header, or
 * length is wrong.
 *
 * Multibase: `z` prefix → base58btc payload.
 * Multicodec: `0xed 0x01` → Ed25519-pub.
 * Then 32 bytes of public key.
 */
export function decodeEd25519PublicKey(multibase: string): Uint8Array {
  if (multibase.length === 0 || multibase[0] !== 'z') {
    throw new Error(
      `expected multibase base58btc prefix "z", got "${multibase[0]}"`,
    );
  }
  const decoded = base58Decode(multibase.slice(1));
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error(
      'multibase payload is not Ed25519-pub multicodec (expected 0xed01)',
    );
  }
  return decoded.subarray(2);
}

/**
 * Encodes a 32-byte raw Ed25519 public key as `Ed25519VerificationKey2020`
 * `publicKeyMultibase` — base58btc with the `z` prefix and the
 * Ed25519-pub multicodec header (`0xed 0x01`).
 */
export function encodeEd25519PublicKey(rawKey: Uint8Array): string {
  if (rawKey.length !== 32) {
    throw new Error(`expected 32-byte Ed25519 key, got ${rawKey.length}`);
  }
  const wrapped = new Uint8Array(34);
  wrapped[0] = 0xed;
  wrapped[1] = 0x01;
  wrapped.set(rawKey, 2);
  return 'z' + base58Encode(wrapped);
}
