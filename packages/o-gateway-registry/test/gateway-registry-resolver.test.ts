import { oAddress } from '@olane/o-core';
import {
  GatewayRegistryResolver,
  StaticSnapshotFetcher,
  AlwaysAcceptVerifier,
  SnapshotFetcher,
  SnapshotVerifier,
} from '../src/index.js';
import {
  RegistrySnapshot,
  GatewayRegistryEntry,
} from '../src/interfaces/index.js';
import { makeEntry, makeSnapshot, TEST_CONFIG } from './fixtures/snapshot.js';

function makeResolver(
  snapshot: RegistrySnapshot,
  opts: { verifier?: SnapshotVerifier; fetcher?: SnapshotFetcher } = {},
): GatewayRegistryResolver {
  const fetcher = opts.fetcher ?? new StaticSnapshotFetcher(snapshot);
  const verifier = opts.verifier ?? new AlwaysAcceptVerifier();
  return new GatewayRegistryResolver(
    new oAddress('o://registry'),
    TEST_CONFIG,
    fetcher,
    verifier,
  );
}

function makeRequest(uri: string) {
  const address = new oAddress(uri);
  return {
    address,
    targetAddress: address,
    node: {} as never,
  };
}

describe('GatewayRegistryResolver — load() lifecycle', () => {
  test('load() fetches the snapshot once and verifies it', async () => {
    const snapshot = makeSnapshot([makeEntry({ name: 'copass' })]);
    const verifyCalls: Array<{ snap: RegistrySnapshot; did: string }> = [];
    const verifier: SnapshotVerifier = {
      async verifySnapshot(snap, did) {
        verifyCalls.push({ snap, did });
      },
      async verifyEntry() {},
    };
    const resolver = makeResolver(snapshot, { verifier });

    await resolver.load();

    expect(verifyCalls).toHaveLength(1);
    expect(verifyCalls[0].snap).toBe(snapshot);
    expect(verifyCalls[0].did).toBe(TEST_CONFIG.expectedMaintainerDid);
  });

  test('load() is concurrency-safe — two simultaneous calls share one fetch', async () => {
    const snapshot = makeSnapshot([makeEntry()]);
    let fetchCount = 0;
    const fetcher: SnapshotFetcher = {
      async fetch() {
        fetchCount += 1;
        return snapshot;
      },
    };
    const resolver = makeResolver(snapshot, { fetcher });

    await Promise.all([resolver.load(), resolver.load()]);

    expect(fetchCount).toBe(1);
  });

  test('load() rejects a snapshot whose maintainer DID does not match config', async () => {
    const snapshot = makeSnapshot([makeEntry()], {
      maintainerSignature: {
        maintainerDid: 'did:web:wrong.example.com',
        keyId: 'did:web:wrong.example.com#key-1',
        algorithm: 'Ed25519',
        value: 'AAAA',
      },
    });
    const resolver = makeResolver(snapshot);

    await expect(resolver.load()).rejects.toThrow(/maintainer DID/);
  });
});

describe('GatewayRegistryResolver — resolve()', () => {
  test('routes to the gateway transport when first segment matches an entry', async () => {
    const entry = makeEntry({
      name: 'copass',
      transports: ['/dns4/leader.copass.example.com/tcp/4000/tls/ws'],
    });
    const resolver = makeResolver(makeSnapshot([entry]));

    const result = await resolver.resolve(
      makeRequest('o://copass/brendon/shell'),
    );

    expect(result.nextHopAddress.toString()).toBe('o://leader');
    const transports = result.nextHopAddress.transports.map((t) => t.value);
    expect(transports).toEqual([
      '/dns4/leader.copass.example.com/tcp/4000/tls/ws',
    ]);
  });

  test('passes through when no entry matches the first segment', async () => {
    const resolver = makeResolver(makeSnapshot([]));

    const req = makeRequest('o://unknown-gateway/foo');
    const result = await resolver.resolve(req);

    expect(result.nextHopAddress).toBe(req.address);
  });

  test('passes through reserved names even if the snapshot somehow has a matching entry', async () => {
    const entry = makeEntry({ name: 'olane' });
    const resolver = makeResolver(makeSnapshot([entry]));

    const req = makeRequest('o://olane/some-tool');
    const result = await resolver.resolve(req);

    expect(result.nextHopAddress).toBe(req.address);
  });

  test('passes through reserved single-character names', async () => {
    const resolver = makeResolver(makeSnapshot([makeEntry({ name: 'a' })]));

    const req = makeRequest('o://a/foo');
    const result = await resolver.resolve(req);

    expect(result.nextHopAddress).toBe(req.address);
  });

  test('drops entries that fail per-entry verification rather than throwing', async () => {
    const entry = makeEntry({ name: 'copass' });
    const verifier: SnapshotVerifier = {
      async verifySnapshot() {
        // accept the snapshot
      },
      async verifyEntry(e: GatewayRegistryEntry) {
        if (e.name === 'copass') throw new Error('forged entry');
      },
    };
    const resolver = makeResolver(makeSnapshot([entry]), { verifier });

    const req = makeRequest('o://copass/brendon');
    const result = await resolver.resolve(req);

    expect(result.nextHopAddress).toBe(req.address);
  });

  test('lazy-loads the snapshot on first resolve when load() was not called', async () => {
    const snapshot = makeSnapshot([makeEntry({ name: 'copass' })]);
    let fetchCount = 0;
    const fetcher: SnapshotFetcher = {
      async fetch() {
        fetchCount += 1;
        return snapshot;
      },
    };
    const resolver = makeResolver(snapshot, { fetcher });

    await resolver.resolve(makeRequest('o://copass/x'));

    expect(fetchCount).toBe(1);
  });

  test('lookup() of a reserved name short-circuits and never fetches', async () => {
    const snapshot = makeSnapshot([makeEntry({ name: 'copass' })]);
    let fetchCount = 0;
    const fetcher: SnapshotFetcher = {
      async fetch() {
        fetchCount += 1;
        return snapshot;
      },
    };
    const resolver = makeResolver(snapshot, { fetcher });

    const result = await resolver.lookup('olane');

    expect(result).toBeNull();
    expect(fetchCount).toBe(0);
  });
});

describe('GatewayRegistryResolver — error posture', () => {
  test('failClosed=true (default) throws when the fetch fails', async () => {
    const fetcher: SnapshotFetcher = {
      async fetch() {
        throw new Error('network down');
      },
    };
    const resolver = new GatewayRegistryResolver(
      new oAddress('o://registry'),
      TEST_CONFIG,
      fetcher,
    );

    await expect(resolver.lookup('copass')).rejects.toThrow(/network down/);
  });

  test('failClosed=false returns null when the fetch fails (test mode only)', async () => {
    const fetcher: SnapshotFetcher = {
      async fetch() {
        throw new Error('network down');
      },
    };
    const resolver = new GatewayRegistryResolver(
      new oAddress('o://registry'),
      { ...TEST_CONFIG, failClosed: false },
      fetcher,
    );

    const result = await resolver.lookup('copass');
    expect(result).toBeNull();
  });
});
