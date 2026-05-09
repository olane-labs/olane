import { DidWebSnapshotVerifier } from '../../src/did/did-web-snapshot-verifier.js';
import { GatewayRegistryEntry } from '../../src/interfaces/index.js';
import { makeEntry, makeSnapshot } from '../fixtures/snapshot.js';
import {
  TestKey,
  generateTestKey,
  makeDidDocument,
  signEntry,
  signSnapshot,
} from './test-keys.js';

interface TestSetup {
  maintainerDid: string;
  maintainerKey: TestKey;
  operatorDid: string;
  operatorKey: TestKey;
  fetcher: typeof globalThis.fetch;
}

function newTestSetup(): TestSetup {
  const maintainerDid = 'did:web:registry.olane.network';
  const maintainerKey = generateTestKey();
  const maintainerKeyId = `${maintainerDid}#key-1`;
  const operatorDid = 'did:web:copass.example.com';
  const operatorKey = generateTestKey();
  const operatorKeyId = `${operatorDid}#key-1`;

  const docs: Record<string, unknown> = {
    'https://registry.olane.network/.well-known/did.json': makeDidDocument(
      maintainerDid,
      maintainerKeyId,
      maintainerKey,
    ),
    'https://copass.example.com/.well-known/did.json': makeDidDocument(
      operatorDid,
      operatorKeyId,
      operatorKey,
    ),
  };

  const fetcher: typeof globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    const doc = docs[url];
    if (!doc) {
      return new Response('not found', { status: 404 });
    }
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { maintainerDid, maintainerKey, operatorDid, operatorKey, fetcher };
}

describe('DidWebSnapshotVerifier — verifySnapshot', () => {
  test('accepts a correctly-signed snapshot', async () => {
    const setup = newTestSetup();
    const snapshot = signSnapshot(
      makeSnapshot([], {
        maintainerSignature: {
          maintainerDid: setup.maintainerDid,
          keyId: `${setup.maintainerDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.maintainerKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(
      verifier.verifySnapshot(snapshot, setup.maintainerDid),
    ).resolves.toBeUndefined();
  });

  test('rejects a snapshot whose maintainer DID does not match config', async () => {
    const setup = newTestSetup();
    const snapshot = signSnapshot(
      makeSnapshot([], {
        maintainerSignature: {
          maintainerDid: setup.maintainerDid,
          keyId: `${setup.maintainerDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.maintainerKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(
      verifier.verifySnapshot(snapshot, 'did:web:other.example.com'),
    ).rejects.toThrow(/maintainer DID mismatch/);
  });

  test('rejects a snapshot signed by the wrong key', async () => {
    const setup = newTestSetup();
    const wrongKey = generateTestKey();
    const snapshot = signSnapshot(
      makeSnapshot([], {
        maintainerSignature: {
          maintainerDid: setup.maintainerDid,
          keyId: `${setup.maintainerDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      wrongKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(
      verifier.verifySnapshot(snapshot, setup.maintainerDid),
    ).rejects.toThrow(/did not verify/);
  });

  test('rejects a snapshot whose payload was tampered with after signing', async () => {
    const setup = newTestSetup();
    const snapshot = signSnapshot(
      makeSnapshot([], {
        maintainerSignature: {
          maintainerDid: setup.maintainerDid,
          keyId: `${setup.maintainerDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.maintainerKey,
    );
    const tampered = { ...snapshot, pinnedCommit: 'tampered-commit' };
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(
      verifier.verifySnapshot(tampered, setup.maintainerDid),
    ).rejects.toThrow(/did not verify/);
  });
});

describe('DidWebSnapshotVerifier — verifyEntry', () => {
  test('accepts a correctly-signed entry', async () => {
    const setup = newTestSetup();
    const entry: GatewayRegistryEntry = signEntry(
      makeEntry({
        operatorDid: setup.operatorDid,
        signature: {
          keyId: `${setup.operatorDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.operatorKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(verifier.verifyEntry(entry)).resolves.toBeUndefined();
  });

  test('rejects an entry signed by the wrong key', async () => {
    const setup = newTestSetup();
    const wrongKey = generateTestKey();
    const entry = signEntry(
      makeEntry({
        operatorDid: setup.operatorDid,
        signature: {
          keyId: `${setup.operatorDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      wrongKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(verifier.verifyEntry(entry)).rejects.toThrow(
      /did not verify/,
    );
  });

  test('rejects an entry whose did:web document is unreachable', async () => {
    const setup = newTestSetup();
    const entry = signEntry(
      makeEntry({
        operatorDid: 'did:web:gone.example.com',
        signature: {
          keyId: 'did:web:gone.example.com#key-1',
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.operatorKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(verifier.verifyEntry(entry)).rejects.toThrow(/404/);
  });

  test('rejects an entry whose key is missing from the DID document', async () => {
    const setup = newTestSetup();
    const entry = signEntry(
      makeEntry({
        operatorDid: setup.operatorDid,
        signature: {
          keyId: `${setup.operatorDid}#key-2`, // not in DID document
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.operatorKey,
    );
    const verifier = new DidWebSnapshotVerifier({ fetch: setup.fetcher });

    await expect(verifier.verifyEntry(entry)).rejects.toThrow(
      /does not contain key/,
    );
  });

  test('caches DID documents — second verifyEntry against same DID does not re-fetch', async () => {
    const setup = newTestSetup();
    let fetchCount = 0;
    const countingFetcher: typeof globalThis.fetch = async (input) => {
      fetchCount += 1;
      return setup.fetcher(input);
    };
    const verifier = new DidWebSnapshotVerifier({ fetch: countingFetcher });

    const entryA = signEntry(
      makeEntry({
        name: 'copass',
        operatorDid: setup.operatorDid,
        signature: {
          keyId: `${setup.operatorDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.operatorKey,
    );
    const entryB = signEntry(
      makeEntry({
        name: 'copass-test',
        operatorDid: setup.operatorDid,
        signature: {
          keyId: `${setup.operatorDid}#key-1`,
          algorithm: 'Ed25519',
          value: '',
        },
      }),
      setup.operatorKey,
    );

    await verifier.verifyEntry(entryA);
    await verifier.verifyEntry(entryB);

    expect(fetchCount).toBe(1);
  });
});
