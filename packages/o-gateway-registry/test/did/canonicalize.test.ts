import { canonicalize } from '../../src/canonical/canonicalize.js';

describe('canonicalize', () => {
  test('object keys are sorted lexicographically', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test('nested objects sort recursively', () => {
    expect(canonicalize({ z: { y: 1, x: 2 }, a: 3 })).toBe(
      '{"a":3,"z":{"x":2,"y":1}}',
    );
  });

  test('arrays preserve order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  test('strings are JSON-escaped', () => {
    expect(canonicalize('hello "world"')).toBe('"hello \\"world\\""');
    expect(canonicalize('line\nbreak')).toBe('"line\\nbreak"');
  });

  test('null/true/false are literal', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(true)).toBe('true');
    expect(canonicalize(false)).toBe('false');
  });

  test('numbers serialize to their string form', () => {
    expect(canonicalize(0)).toBe('0');
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize(-1)).toBe('-1');
  });

  test('non-finite numbers throw', () => {
    expect(() => canonicalize(Infinity)).toThrow(/non-finite/);
    expect(() => canonicalize(NaN)).toThrow(/non-finite/);
  });

  test('undefined keys are dropped', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  test('undefined value at the top level throws', () => {
    expect(() => canonicalize(undefined)).toThrow();
  });

  test('two reorderings produce identical output', () => {
    const a = { extra: 'x', name: 'y', transports: ['/a', '/b'] };
    const b = { transports: ['/a', '/b'], name: 'y', extra: 'x' };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});
