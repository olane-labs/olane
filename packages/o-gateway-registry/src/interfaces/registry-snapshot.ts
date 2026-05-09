import { GatewayRegistryEntry } from './registry-entry.js';

/**
 * A pinned snapshot of the public-good registry at a specific commit.
 *
 * Clients fetch a snapshot, verify each entry's signature against its
 * operator DID, and cache the result. The whole snapshot is itself signed
 * by the registry-maintainer key (Olane Inc. for v0; rotated to a neutral
 * foundation key in v3 per ADR 0025 phasing).
 *
 * The snapshot is the unit of mirroring: any party can serve a verbatim
 * copy and a client can verify it independently of which mirror it came
 * from.
 */
export interface RegistrySnapshot {
  /** Schema version of the snapshot format. v0 = 1. */
  schemaVersion: 1;

  /** Commit hash in olane-labs/gateway-registry that this snapshot pins to. */
  pinnedCommit: string;

  /** ISO-8601 timestamp the snapshot was assembled. */
  generatedAt: string;

  /** All gateway entries at the pinned commit. */
  entries: GatewayRegistryEntry[];

  /** Detached signature by the registry-maintainer key over the canonicalized snapshot. */
  maintainerSignature: SnapshotSignature;
}

export interface SnapshotSignature {
  /** DID identifying the registry maintainer at signing time. */
  maintainerDid: string;

  /** DID URL fragment identifying the signing key. */
  keyId: string;

  /** Signature algorithm. v0 only supports `Ed25519`. */
  algorithm: 'Ed25519';

  /** Base64-encoded signature bytes. */
  value: string;
}
