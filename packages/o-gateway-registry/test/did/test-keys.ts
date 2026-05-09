import {
  generateKeyPairSync,
  KeyObject,
  sign as cryptoSign,
} from 'node:crypto';
import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../../src/interfaces/index.js';
import {
  entrySigningPayload,
  snapshotSigningPayload,
} from '../../src/canonical/signing-payload.js';
import { DidDocument } from '../../src/did/did-document.js';
import { encodeEd25519PublicKey } from '../../src/did/multibase.js';

/**
 * Generates an Ed25519 key pair and returns the components a test
 * fixture needs: the key objects, the raw 32-byte public key, the
 * `Ed25519VerificationKey2020` `publicKeyMultibase` value, and a
 * helper that signs arbitrary canonicalized payloads.
 */
export function generateTestKey(): TestKey {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublic = extractRawEd25519Public(publicKey);
  const publicKeyMultibase = encodeEd25519PublicKey(rawPublic);
  return {
    publicKey,
    privateKey,
    rawPublic,
    publicKeyMultibase,
    sign(payload: Uint8Array): string {
      const buf = Buffer.from(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength,
      );
      const sig = cryptoSign(null, buf, privateKey);
      return sig.toString('base64');
    },
  };
}

export interface TestKey {
  publicKey: KeyObject;
  privateKey: KeyObject;
  rawPublic: Uint8Array;
  publicKeyMultibase: string;
  sign(payload: Uint8Array): string;
}

export function makeDidDocument(
  did: string,
  keyId: string,
  key: TestKey,
): DidDocument {
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: key.publicKeyMultibase,
      },
    ],
    assertionMethod: [keyId],
  };
}

export function signEntry(
  entry: GatewayRegistryEntry,
  key: TestKey,
): GatewayRegistryEntry {
  const payload = entrySigningPayload({ ...entry, signature: undefined as never });
  return {
    ...entry,
    signature: {
      keyId: entry.signature.keyId,
      algorithm: 'Ed25519',
      value: key.sign(payload),
    },
  };
}

export function signSnapshot(
  snapshot: RegistrySnapshot,
  key: TestKey,
): RegistrySnapshot {
  const payload = snapshotSigningPayload({
    ...snapshot,
    maintainerSignature: undefined as never,
  });
  return {
    ...snapshot,
    maintainerSignature: {
      maintainerDid: snapshot.maintainerSignature.maintainerDid,
      keyId: snapshot.maintainerSignature.keyId,
      algorithm: 'Ed25519',
      value: key.sign(payload),
    },
  };
}

function extractRawEd25519Public(key: KeyObject): Uint8Array {
  // Export as raw SPKI DER and strip the 12-byte Ed25519 SPKI prefix.
  const der = key.export({ type: 'spki', format: 'der' });
  if (der.length !== 44) {
    throw new Error(`unexpected SPKI length: ${der.length}`);
  }
  return new Uint8Array(der.subarray(12));
}

