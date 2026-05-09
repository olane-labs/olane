import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../interfaces/index.js';

/**
 * Verifies a snapshot before the resolver trusts it.
 *
 * v0 ships an interface and a stub. **Real signature verification lands
 * in the next stacked PR (DidWebResolver + SignatureVerifier)**, where
 * we wire `did:web` resolution and Ed25519 signature checks. This stub
 * is here so the resolver's call sites are stable across the two PRs —
 * the resolver depends on `SnapshotVerifier`, not on the verification
 * mechanism, so swapping in the real impl is a one-line change in the
 * factory.
 *
 * Tests that need to bypass verification use `AlwaysAcceptVerifier`.
 * Tests that need to assert verification was called use a spy
 * implementation.
 */
export interface SnapshotVerifier {
  /**
   * Verify the snapshot's maintainer signature. Throws if invalid.
   *
   * @param snapshot The snapshot as fetched.
   * @param expectedMaintainerDid The DID the resolver was configured to
   *   trust. The verifier MUST refuse the snapshot if its
   *   `maintainerSignature.maintainerDid` does not equal this value.
   */
  verifySnapshot(
    snapshot: RegistrySnapshot,
    expectedMaintainerDid: string,
  ): Promise<void>;

  /**
   * Verify a single gateway entry's operator signature. Throws if
   * invalid. The resolver calls this for each entry it intends to
   * surface; entries that fail verification are dropped, not returned.
   */
  verifyEntry(entry: GatewayRegistryEntry): Promise<void>;
}

/**
 * v0 stub — accepts everything. Replaced by the real `did:web`-backed
 * verifier in the next stacked PR. Tests can use this directly.
 *
 * The class name is deliberately ugly so a code search for
 * `AlwaysAcceptVerifier` flags every place a real verifier needs to be
 * substituted. Production code MUST NOT instantiate this class.
 */
export class AlwaysAcceptVerifier implements SnapshotVerifier {
  async verifySnapshot(
    snapshot: RegistrySnapshot,
    expectedMaintainerDid: string,
  ): Promise<void> {
    if (snapshot.maintainerSignature?.maintainerDid !== expectedMaintainerDid) {
      throw new Error(
        `snapshot maintainer DID mismatch: expected "${expectedMaintainerDid}", got "${snapshot.maintainerSignature?.maintainerDid}"`,
      );
    }
  }

  async verifyEntry(_entry: GatewayRegistryEntry): Promise<void> {
    // intentionally empty in v0 stub
  }
}
