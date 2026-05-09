/**
 * Construction-time configuration for `GatewayRegistryResolver`.
 *
 * Two layers of pinning, both required:
 *   1. `snapshotUrl` — where to fetch the signed snapshot from (HTTPS).
 *      Mirrors are allowed; the snapshot signature, not the URL, is what
 *      the resolver trusts.
 *   2. `expectedMaintainerDid` — the DID whose signature the resolver
 *      requires on the snapshot. Pins trust to a specific maintainer
 *      identity rather than to the hosting URL.
 */
export interface GatewayRegistryResolverConfig {
  /** HTTPS URL serving the signed registry snapshot JSON. */
  snapshotUrl: string;

  /** DID URI of the registry maintainer whose signature is required on the snapshot. */
  expectedMaintainerDid: string;

  /**
   * Local filesystem path to cache the verified snapshot at. If unset, no
   * disk caching — the resolver fetches on every cold start. Recommended
   * for production, optional for tests.
   */
  cachePath?: string;

  /**
   * Maximum age of the cached snapshot before a re-fetch is required, in
   * milliseconds. Default 1 hour. Stale snapshots are kept usable past
   * this if the network is unreachable; freshness is best-effort, not
   * mandatory.
   */
  maxCacheAgeMs?: number;

  /**
   * If true, the resolver refuses to start when the snapshot signature
   * does not verify. If false, it falls back to the legacy `o://olane`
   * default and emits a warning. Default true. Only set false in tests.
   */
  failClosed?: boolean;
}
