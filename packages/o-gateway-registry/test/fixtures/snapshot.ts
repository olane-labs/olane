import {
  GatewayRegistryEntry,
  RegistrySnapshot,
} from '../../src/interfaces/index.js';

const TEST_MAINTAINER_DID = 'did:web:registry.olane.network';

export function makeEntry(
  overrides: Partial<GatewayRegistryEntry> = {},
): GatewayRegistryEntry {
  return {
    name: 'copass',
    operatorDid: 'did:web:copass.example.com',
    transports: ['/dns4/leader.copass.example.com/tcp/4000/tls/ws'],
    description: 'Copass operator gateway (test fixture)',
    logo: '',
    website: 'https://copass.example.com',
    defaultCapabilityClass: 'side-effecting',
    publishedAt: '2026-05-09T00:00:00Z',
    signature: {
      keyId: 'did:web:copass.example.com#key-1',
      algorithm: 'Ed25519',
      value: 'AAAA',
    },
    ...overrides,
  };
}

export function makeSnapshot(
  entries: GatewayRegistryEntry[],
  overrides: Partial<RegistrySnapshot> = {},
): RegistrySnapshot {
  return {
    schemaVersion: 1,
    pinnedCommit: 'abc123',
    generatedAt: '2026-05-09T00:00:00Z',
    entries,
    maintainerSignature: {
      maintainerDid: TEST_MAINTAINER_DID,
      keyId: `${TEST_MAINTAINER_DID}#key-1`,
      algorithm: 'Ed25519',
      value: 'AAAA',
    },
    ...overrides,
  };
}

export const TEST_CONFIG = {
  snapshotUrl: 'https://registry.olane.network/v0/snapshot.json',
  expectedMaintainerDid: TEST_MAINTAINER_DID,
};
