import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../interfaces/index.js';
import { canonicalize } from './canonicalize.js';

/**
 * Strips the verification-only fields from an entry and returns the
 * canonical bytes that the operator's signature is computed over.
 *
 * The operator signs the entry MINUS its own `signature` field (a chicken-
 * and-egg problem otherwise) and MINUS `verifiedAt` (populated only after
 * verification — never present at signing time).
 */
export function entrySigningPayload(entry: GatewayRegistryEntry): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature, verifiedAt, ...signed } = entry;
  return new TextEncoder().encode(canonicalize(signed));
}

/**
 * Strips the maintainer signature and returns the canonical bytes the
 * registry-maintainer key signs over.
 *
 * Note: the snapshot signature covers the entries (which themselves are
 * already-signed objects). This is intentional — the maintainer is
 * attesting "I served this set of entries at this commit at this time,"
 * not re-attesting the entries' contents. An entry whose own signature
 * fails will be dropped by the verifier even if the snapshot signature
 * is valid.
 */
export function snapshotSigningPayload(
  snapshot: RegistrySnapshot,
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maintainerSignature, ...signed } = snapshot;
  return new TextEncoder().encode(canonicalize(signed));
}
