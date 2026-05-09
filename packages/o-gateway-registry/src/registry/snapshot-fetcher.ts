import { RegistrySnapshot } from '../interfaces/registry-snapshot.js';

/**
 * Fetches a signed registry snapshot.
 *
 * The interface is deliberately narrow so tests can substitute an
 * in-memory fixture for the HTTPS implementation. Production code uses
 * `HttpsSnapshotFetcher`; tests use `StaticSnapshotFetcher` (this module)
 * or write their own.
 *
 * Implementations MUST NOT verify signatures — that is the resolver's
 * job. The fetcher's only contract is: "give me the bytes at this URL,
 * parsed as JSON, conforming to `RegistrySnapshot` shape." If the bytes
 * are malformed or unreachable, throw.
 */
export interface SnapshotFetcher {
  fetch(url: string): Promise<RegistrySnapshot>;
}

/**
 * Fetches the snapshot over HTTPS with `globalThis.fetch`.
 *
 * Node 20+ ships a built-in `fetch`, so no additional dependency. The
 * implementation enforces HTTPS at the call site — `http://` URLs throw
 * synchronously. Mirrors that serve over plain HTTP are not supported in
 * v0 (the snapshot signature provides integrity, but plain HTTP allows
 * downgrade-and-stall attacks against availability).
 */
export class HttpsSnapshotFetcher implements SnapshotFetcher {
  async fetch(url: string): Promise<RegistrySnapshot> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `snapshot fetcher requires HTTPS, got "${parsed.protocol}//${parsed.host}"`,
      );
    }
    const response = await globalThis.fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        `snapshot fetch failed: ${response.status} ${response.statusText} for ${url}`,
      );
    }
    const body = (await response.json()) as RegistrySnapshot;
    if (body?.schemaVersion !== 1) {
      throw new Error(
        `unsupported registry snapshot schemaVersion: ${body?.schemaVersion}`,
      );
    }
    if (!Array.isArray(body.entries)) {
      throw new Error('registry snapshot is missing or has invalid `entries`');
    }
    return body;
  }
}

/**
 * Test-only fetcher. Returns whatever snapshot it was constructed with.
 * Useful for unit tests of the resolver where signature verification is
 * stubbed and the network is not involved.
 */
export class StaticSnapshotFetcher implements SnapshotFetcher {
  constructor(private readonly snapshot: RegistrySnapshot) {}

  async fetch(_url: string): Promise<RegistrySnapshot> {
    return this.snapshot;
  }
}
