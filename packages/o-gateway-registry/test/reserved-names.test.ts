import {
  RESERVED_GATEWAY_NAMES,
  isReservedGatewayName,
  validateGatewayName,
} from '../src/registry/reserved-names.js';

describe('reserved gateway names', () => {
  test('the legacy "olane" namespace is reserved', () => {
    expect(isReservedGatewayName('olane')).toBe(true);
  });

  test('reservation is case-insensitive', () => {
    expect(isReservedGatewayName('OLANE')).toBe(true);
    expect(isReservedGatewayName('Olane')).toBe(true);
  });

  test('all documented reservations are flagged', () => {
    for (const name of RESERVED_GATEWAY_NAMES) {
      expect(isReservedGatewayName(name)).toBe(true);
    }
  });

  test('single-character names are reserved (too scarce to allocate)', () => {
    expect(isReservedGatewayName('a')).toBe(true);
    expect(isReservedGatewayName('z')).toBe(true);
    expect(isReservedGatewayName('0')).toBe(true);
    expect(isReservedGatewayName('9')).toBe(true);
  });

  test('a normal two-character name is not reserved', () => {
    expect(isReservedGatewayName('ab')).toBe(false);
    expect(isReservedGatewayName('copass')).toBe(false);
    expect(isReservedGatewayName('your-grandma')).toBe(false);
  });
});

describe('validateGatewayName', () => {
  test('accepts the canonical examples from ADR 0025', () => {
    expect(validateGatewayName('copass')).toBeNull();
    expect(validateGatewayName('your-grandma')).toBeNull();
    expect(validateGatewayName('acme-corp')).toBeNull();
  });

  test('rejects empty input', () => {
    expect(validateGatewayName('')).toMatch(/empty/);
  });

  test('rejects single-character names', () => {
    expect(validateGatewayName('x')).toMatch(/at least 2/);
  });

  test('rejects names longer than 63 characters', () => {
    const tooLong = 'a'.repeat(64);
    expect(validateGatewayName(tooLong)).toMatch(/at most 63/);
  });

  test('rejects uppercase', () => {
    expect(validateGatewayName('Copass')).toMatch(/lowercase/);
  });

  test('rejects underscore (DNS-label compatibility)', () => {
    expect(validateGatewayName('foo_bar')).toMatch(/lowercase ASCII/);
  });

  test('rejects leading hyphen', () => {
    expect(validateGatewayName('-copass')).toMatch(/leading or trailing hyphen/);
  });

  test('rejects trailing hyphen', () => {
    expect(validateGatewayName('copass-')).toMatch(/leading or trailing hyphen/);
  });

  test('rejects reserved names with the reservation reason', () => {
    expect(validateGatewayName('olane')).toMatch(/reserved/);
    expect(validateGatewayName('leader')).toMatch(/reserved/);
    expect(validateGatewayName('registry')).toMatch(/reserved/);
  });

  test('accepts hyphens in the interior', () => {
    expect(validateGatewayName('a-b-c')).toBeNull();
  });

  test('accepts digits', () => {
    expect(validateGatewayName('copass2')).toBeNull();
    expect(validateGatewayName('v3')).toBeNull();
  });
});
