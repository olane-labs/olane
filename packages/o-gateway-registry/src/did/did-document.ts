/**
 * Minimal subset of the W3C DID Core DID Document model.
 *
 * https://www.w3.org/TR/did-core/#did-documents
 *
 * v0 only consumes Ed25519 verification methods of type
 * `Ed25519VerificationKey2020`, with the public key encoded as
 * multibase base58btc per `publicKeyMultibase`. Other key types
 * (JsonWebKey2020, secp256k1, etc.) are silently ignored — the
 * verifier returns "no key found" and the entry is dropped.
 *
 * This narrow surface is deliberate. v0 is operator-friendly enough
 * (a `did:web` document hosted at `.well-known/did.json` with one
 * Ed25519 key is roughly 8 lines of JSON), and v1 will expand to
 * additional key types as needed.
 */
export interface DidDocument {
  '@context'?: string | string[];
  id: string;
  verificationMethod?: VerificationMethod[];
  assertionMethod?: Array<string | VerificationMethod>;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;

  /** Ed25519 public key, multibase-encoded with prefix `z`. */
  publicKeyMultibase?: string;

  /** Alternative encoding the verifier doesn't use in v0. */
  publicKeyJwk?: unknown;
}
