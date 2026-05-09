import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../interfaces/index.js';
import { SnapshotVerifier } from '../registry/snapshot-verifier.js';
import {
  entrySigningPayload,
  snapshotSigningPayload,
} from '../canonical/index.js';
import { DidDocument, VerificationMethod } from './did-document.js';
import { decodeEd25519PublicKey } from './multibase.js';
import { DidWebResolver, DidWebResolverConfig } from './did-web-resolver.js';

/**
 * Real signature verifier — replaces `AlwaysAcceptVerifier` from the
 * skeleton PR. Resolves operator and maintainer DIDs via `did:web`,
 * extracts Ed25519 verification keys, and verifies signatures over
 * canonicalized payloads.
 *
 * Caching: the verifier memoizes resolved DID documents for the
 * lifetime of the instance. Each operator DID is fetched at most
 * once. Resolvers SHOULD construct a new verifier per snapshot
 * lifecycle if they want to pick up key rotations.
 *
 * Failure modes:
 *   - DID document fetch fails / 404 / non-https → throws
 *   - DID document missing the requested key → throws
 *   - Multibase decode / multicodec header wrong → throws
 *   - Signature does not verify → throws
 *
 * The resolver upstream catches per-entry throws and drops the entry
 * (X.509 chain semantics — one bad operator doesn't poison the
 * snapshot). Snapshot-level failures propagate.
 */
export class DidWebSnapshotVerifier implements SnapshotVerifier {
  private readonly resolver: DidWebResolver;
  private readonly cache = new Map<string, Promise<DidDocument>>();

  constructor(config: DidWebResolverConfig = {}) {
    this.resolver = new DidWebResolver(config);
  }

  async verifySnapshot(
    snapshot: RegistrySnapshot,
    expectedMaintainerDid: string,
  ): Promise<void> {
    const sig = snapshot.maintainerSignature;
    if (!sig) {
      throw new Error('snapshot is missing maintainerSignature');
    }
    if (sig.maintainerDid !== expectedMaintainerDid) {
      throw new Error(
        `snapshot maintainer DID mismatch: expected "${expectedMaintainerDid}", got "${sig.maintainerDid}"`,
      );
    }
    if (sig.algorithm !== 'Ed25519') {
      throw new Error(`unsupported snapshot signature algorithm: ${sig.algorithm}`);
    }
    const doc = await this.resolveDid(sig.maintainerDid);
    const key = findVerificationKey(doc, sig.keyId);
    const payload = snapshotSigningPayload(snapshot);
    const ok = ed25519Verify(key, payload, sig.value);
    if (!ok) {
      throw new Error('snapshot maintainer signature did not verify');
    }
  }

  async verifyEntry(entry: GatewayRegistryEntry): Promise<void> {
    if (!entry.signature) {
      throw new Error(`entry "${entry.name}" is missing a signature`);
    }
    if (entry.signature.algorithm !== 'Ed25519') {
      throw new Error(
        `entry "${entry.name}" signature algorithm "${entry.signature.algorithm}" is not supported`,
      );
    }
    const doc = await this.resolveDid(entry.operatorDid);
    const key = findVerificationKey(doc, entry.signature.keyId);
    const payload = entrySigningPayload(entry);
    const ok = ed25519Verify(key, payload, entry.signature.value);
    if (!ok) {
      throw new Error(`entry "${entry.name}" signature did not verify`);
    }
  }

  private resolveDid(did: string): Promise<DidDocument> {
    const cached = this.cache.get(did);
    if (cached) return cached;
    const promise = this.resolver.resolve(did).catch((err) => {
      // On failure, evict so a retry can re-fetch.
      this.cache.delete(did);
      throw err;
    });
    this.cache.set(did, promise);
    return promise;
  }
}

function findVerificationKey(
  doc: DidDocument,
  keyId: string,
): Uint8Array {
  const methods = doc.verificationMethod ?? [];
  const method = methods.find((m) => m.id === keyId);
  if (!method) {
    throw new Error(`DID document does not contain key "${keyId}"`);
  }
  return extractEd25519Key(method);
}

function extractEd25519Key(method: VerificationMethod): Uint8Array {
  if (method.type !== 'Ed25519VerificationKey2020') {
    throw new Error(
      `unsupported verification method type: ${method.type} (v0 requires Ed25519VerificationKey2020)`,
    );
  }
  if (!method.publicKeyMultibase) {
    throw new Error(
      `verification method "${method.id}" missing publicKeyMultibase`,
    );
  }
  return decodeEd25519PublicKey(method.publicKeyMultibase);
}

function ed25519Verify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signatureBase64: string,
): boolean {
  // Wrap the raw 32-byte Ed25519 public key in a SubjectPublicKeyInfo
  // DER envelope so node:crypto's createPublicKey accepts it.
  const spki = ed25519RawToSpki(publicKey);
  const keyObject = createPublicKey({
    key: spki,
    format: 'der',
    type: 'spki',
  });
  const signature = Buffer.from(signatureBase64, 'base64');
  return cryptoVerify(null, message, keyObject, signature);
}

/**
 * Wraps a raw 32-byte Ed25519 public key in the SubjectPublicKeyInfo
 * DER structure (RFC 8410 §4):
 *
 *   SEQUENCE {
 *     SEQUENCE { OID 1.3.101.112 }   -- id-Ed25519
 *     BIT STRING (no unused bits) { <32-byte raw key> }
 *   }
 *
 * The resulting envelope is exactly 44 bytes for any Ed25519 key, so
 * we hand-build it rather than pulling an ASN.1 library. The 12-byte
 * prefix is the OID + length headers; the rest is the raw key.
 */
function ed25519RawToSpki(rawKey: Uint8Array): Buffer {
  if (rawKey.length !== 32) {
    throw new Error(`expected 32-byte Ed25519 key, got ${rawKey.length}`);
  }
  const prefix = Buffer.from([
    0x30, 0x2a, // SEQUENCE, length 42
    0x30, 0x05, // SEQUENCE, length 5 (algorithm identifier)
    0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (id-Ed25519)
    0x03, 0x21, 0x00, // BIT STRING, length 33, 0 unused bits
  ]);
  return Buffer.concat([prefix, Buffer.from(rawKey)]);
}
