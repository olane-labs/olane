/**
 * Top-level gateway namespaces that cannot be claimed by an operator.
 *
 * Locked by ADR 0025 §"Naming Policy". The list is intentionally small —
 * each entry has a concrete reason for the carve-out (collides with an
 * existing routing primitive, or is the legacy default, or is reserved
 * for the substrate itself).
 *
 * Names are compared lowercase. The registry build also rejects any
 * gateway name that is exactly one ASCII letter or digit, on the same
 * grounds as DNS reserves single-letter SLDs — they are too scarce to
 * allocate first-come-first-served.
 */
export const RESERVED_GATEWAY_NAMES: readonly string[] = [
  // Legacy default. Keeps `o://olane` resolving to the historical leader
  // until the deprecation timeline (its own follow-up ADR) is locked.
  'olane',

  // Localhost-equivalents. Reserved for client-side routing rules that
  // never traverse the public registry.
  'localhost',
  'local',

  // Collides with the `o://leader` restricted address inside o-core.
  'leader',

  // Collides with the `o://lane` runtime / `oLaneTool` namespace.
  'lane',

  // Reserved for any future substrate-internal addressing (e.g. a
  // resolver-of-resolvers, snapshot index, or v3 governance directory).
  'registry',

  // Reserved for any internal-only routing the substrate may need to
  // express (e.g. callback-only addresses).
  'internal',
] as const;

/**
 * Returns true if `name` is reserved and cannot be claimed as a top-level
 * gateway namespace. Comparison is case-insensitive; the registry only
 * accepts lowercase ASCII for new entries (ADR 0025 §"Naming Policy"),
 * but reservation enforcement is permissive on input case.
 */
export function isReservedGatewayName(name: string): boolean {
  const normalized = name.toLowerCase();
  if (RESERVED_GATEWAY_NAMES.includes(normalized)) {
    return true;
  }
  // Single-character names — too scarce to allocate first-come-first-served.
  if (/^[a-z0-9]$/.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Validates a gateway name for v0 publication. Returns null if valid, or
 * a human-readable rejection reason. Locked by ADR 0025 §"Naming Policy":
 *   - lowercase ASCII letters, digits, hyphens
 *   - 2–63 characters (DNS-label compatible to keep did:web upgrades cheap)
 *   - no leading or trailing hyphen
 *   - not a reserved name
 *
 * IDN / unicode is explicitly out of scope for v0 — flagged for a later
 * ADR if adoption data shows the floor is binding.
 */
export function validateGatewayName(name: string): string | null {
  if (typeof name !== 'string' || name.length === 0) {
    return 'gateway name is empty';
  }
  if (name.length < 2) {
    return 'gateway name must be at least 2 characters (single-character names are reserved)';
  }
  if (name.length > 63) {
    return 'gateway name must be at most 63 characters (DNS-label compatible)';
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return 'gateway name must be lowercase ASCII letters, digits, and hyphens, with no leading or trailing hyphen';
  }
  if (isReservedGatewayName(name)) {
    return `gateway name "${name}" is reserved and cannot be claimed`;
  }
  return null;
}
