import {
  oAddress,
  oAddressResolver,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RouteResponse,
} from '@olane/o-core';
import { oNodeTransport } from '@olane/o-node';
import { GatewayRegistryResolverConfig } from '../interfaces/resolver-config.js';
import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../interfaces/index.js';
import {
  HttpsSnapshotFetcher,
  SnapshotFetcher,
} from './snapshot-fetcher.js';
import {
  AlwaysAcceptVerifier,
  SnapshotVerifier,
} from './snapshot-verifier.js';
import { isReservedGatewayName } from './reserved-names.js';

/**
 * Resolves the first path segment of an `o://` address — the gateway
 * namespace — to a libp2p multiaddr by reading a pinned, signed
 * snapshot of the public-good registry at
 * `github.com/olane-labs/gateway-registry`.
 *
 * Slot in the resolver chain: ahead of `oGatewayResolver`. If this
 * resolver matches the first segment against a verified registry
 * entry, it returns the gateway leader's transports as the next hop.
 * If no entry matches, it passes through and the chain falls back to
 * the legacy `oGatewayResolver` (which still handles `o://olane`).
 *
 * Reserved names (`olane`, `localhost`, `local`, `leader`, `lane`,
 * `registry`, `internal`, single-character) always pass through. The
 * resolver never claims a reserved namespace even if a registry entry
 * for it somehow exists — registry validation happens at publication
 * time, but the resolver is defense-in-depth.
 *
 * Construction is cheap. Loading the snapshot is async. Call
 * `load()` once at startup, or rely on the lazy `resolve()` path
 * (first resolve fetches; subsequent resolves use the cached
 * snapshot).
 */
export class GatewayRegistryResolver extends oAddressResolver {
  private snapshot: RegistrySnapshot | null = null;
  private snapshotFetchedAt: number | null = null;
  private loadingPromise: Promise<void> | null = null;

  constructor(
    address: oAddress,
    private readonly config: GatewayRegistryResolverConfig,
    private readonly fetcher: SnapshotFetcher = new HttpsSnapshotFetcher(),
    private readonly verifier: SnapshotVerifier = new AlwaysAcceptVerifier(),
  ) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/registry')];
  }

  /**
   * Eagerly load the snapshot. Idempotent — a second concurrent call
   * awaits the in-flight fetch instead of issuing a duplicate request.
   * Resolver consumers SHOULD call this once at process startup.
   */
  async load(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    this.loadingPromise = this.doLoad();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async doLoad(): Promise<void> {
    const snapshot = await this.fetcher.fetch(this.config.snapshotUrl);
    await this.verifier.verifySnapshot(
      snapshot,
      this.config.expectedMaintainerDid,
    );
    this.snapshot = snapshot;
    this.snapshotFetchedAt = Date.now();
  }

  private isStale(): boolean {
    if (!this.snapshotFetchedAt) return true;
    const ttl = this.config.maxCacheAgeMs ?? 60 * 60 * 1000;
    return Date.now() - this.snapshotFetchedAt > ttl;
  }

  /**
   * Returns the entry for `name`, or null if no entry matches, the name
   * is reserved, or the entry fails per-entry verification.
   *
   * Per-entry verification is best-effort: an individual entry that
   * fails verification is dropped silently, while a snapshot-level
   * verification failure throws. This matches the security posture of
   * X.509 — one bad cert in a chain doesn't poison the rest.
   */
  async lookup(name: string): Promise<GatewayRegistryEntry | null> {
    if (isReservedGatewayName(name)) {
      return null;
    }
    if (!this.snapshot || this.isStale()) {
      try {
        await this.load();
      } catch (err) {
        if (this.config.failClosed !== false) {
          throw err;
        }
        return null;
      }
    }
    const entry = this.snapshot!.entries.find((e) => e.name === name);
    if (!entry) {
      return null;
    }
    try {
      await this.verifier.verifyEntry(entry);
    } catch {
      return null;
    }
    return { ...entry, verifiedAt: new Date().toISOString() };
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, targetAddress, request: resolveRequest } = request;
    const firstSegment = address.paths.split('/')[0];

    // Empty paths (e.g., a bare `o://` somehow) — pass through, let the
    // chain handle it. Defensive — the caller upstream should reject
    // these earlier.
    if (!firstSegment) {
      return passthrough(address, targetAddress, resolveRequest);
    }

    // Reserved names — always pass through. The legacy
    // `oGatewayResolver` handles `o://olane`; other reservations have
    // no legitimate registry entry.
    if (isReservedGatewayName(firstSegment)) {
      return passthrough(address, targetAddress, resolveRequest);
    }

    const entry = await this.lookup(firstSegment);
    if (!entry) {
      return passthrough(address, targetAddress, resolveRequest);
    }

    const gatewayLeader = oAddress.leader();
    gatewayLeader.setTransports(
      entry.transports.map((t) => new oNodeTransport(t)),
    );
    return {
      nextHopAddress: gatewayLeader,
      targetAddress: targetAddress,
      requestOverride: resolveRequest,
    };
  }
}

function passthrough(
  address: oAddress,
  targetAddress: oAddress,
  requestOverride: ResolveRequest['request'],
): RouteResponse {
  return {
    nextHopAddress: address,
    targetAddress: targetAddress,
    requestOverride,
  };
}
