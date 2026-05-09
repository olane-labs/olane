import { oGateway } from '@olane/o-gateway-interface';

/**
 * A single gateway entry in the public-good registry.
 *
 * One entry per top-level `o://<name>` namespace. Each entry is signed by
 * the operator's DID-bound key; v0 uses `did:web` (resolves through DNS to
 * a `.well-known/did.json`) with a documented upgrade path to `did:plc`
 * for v1.
 *
 * The on-disk shape (signed JSON) and the in-memory shape diverge by one
 * field: on disk, `signature` is required; in memory after verification,
 * `verifiedAt` is populated. Resolvers SHOULD never expose unverified
 * entries to callers.
 */
export interface GatewayRegistryEntry extends oGateway {
  /** First path segment under `o://`. Lowercase ASCII, single segment, no dots. */
  name: string;

  /** DID URI identifying the operator. v0: `did:web:...`. v1: `did:web:...` or `did:plc:...`. */
  operatorDid: string;

  /**
   * libp2p multiaddrs the gateway can be dialed at. Order is the operator's
   * advertised preference; clients SHOULD attempt in order with reasonable
   * back-off.
   */
  transports: string[];

  /** Free-text description shown in `olane gateway list`. */
  description: string;

  /** Operator logo URL (optional, advisory only). */
  logo: string;

  /** Operator website URL (optional, advisory only). */
  website: string;

  /**
   * Capability classification per ADR 0025 §"Trust & Governance" and the
   * v2 essay's seventh property. v0 only requires `read-only`/`side-effecting`/
   * `irreversible`/`high-risk` at the gateway level; per-tool classification
   * lands in v1.
   */
  defaultCapabilityClass:
    | 'read-only'
    | 'side-effecting'
    | 'irreversible'
    | 'high-risk';

  /** ISO-8601 timestamp the entry was first published or last updated. */
  publishedAt: string;

  /** Detached signature over the canonicalized entry, by the operator's DID-bound key. */
  signature: SignatureBlock;

  /** Populated post-verification by the resolver; never present on disk. */
  verifiedAt?: string;
}

export interface SignatureBlock {
  /** DID URL fragment identifying which key in the DID document signed the entry. */
  keyId: string;

  /** Signature algorithm. v0 only supports `Ed25519`. */
  algorithm: 'Ed25519';

  /** Base64-encoded signature bytes. */
  value: string;
}
