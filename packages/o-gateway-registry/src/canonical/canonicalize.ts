/**
 * RFC 8785 (JSON Canonicalization Scheme) — minimal subset.
 *
 * Canonicalization is required for signing and verification to be
 * deterministic across clients. Two parties must serialize the same
 * object to the same bytes, otherwise a valid signature looks invalid
 * to the verifier.
 *
 * Subset implemented:
 *   - Object keys sorted lexicographically (UTF-16 code-point order
 *     per RFC 8785 §3.2).
 *   - No insignificant whitespace.
 *   - Strings escaped per RFC 8785 §3.2.2.4 (ASCII-printable except for
 *     `"` and `\`; control chars use `\u00XX`).
 *   - Numbers serialized via `Number.prototype.toString()` for integers
 *     and finite floats. RFC 8785 mandates ECMA-404-compliant number
 *     formatting; v0 only supports integers + ISO-8601 strings, so
 *     tight-rope number formatting is out of scope.
 *   - `null`, `true`, `false` literal.
 *
 * Not implemented (out of scope for v0; sufficient for our payload
 * shape):
 *   - Floats with high precision (we don't sign floats).
 *   - BigInt (we don't serialize BigInt).
 *   - `undefined` (rejected — RFC 8785 doesn't accept it).
 *
 * If the input contains a value the canonicalizer doesn't know how to
 * serialize, it throws — silent acceptance would produce a string that
 * verifies "successfully" but doesn't match what the signer signed.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('canonicalize: non-finite number');
    }
    return String(value);
  }
  if (typeof value === 'string') {
    return encodeString(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return (
      '{' +
      keys
        .map((k) => encodeString(k) + ':' + canonicalize(obj[k]))
        .join(',') +
      '}'
    );
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}

function encodeString(s: string): string {
  // JSON.stringify already escapes control chars and quotes correctly;
  // the only deviation from RFC 8785 is that JSON.stringify is allowed
  // to escape `/` (it doesn't), and forward slash escaping is optional
  // per the RFC. v0 is consistent with both signers and verifiers using
  // the same library, so we accept JSON.stringify's exact output.
  return JSON.stringify(s);
}
