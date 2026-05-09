import { DidDocument } from './did-document.js';

/**
 * Resolves a `did:web` DID to its DID document.
 *
 * https://w3c-ccg.github.io/did-method-web/
 *
 * Algorithm:
 *   - `did:web:example.com`           → `https://example.com/.well-known/did.json`
 *   - `did:web:example.com:user:alice` → `https://example.com/user/alice/did.json`
 *   - `did:web:example.com%3A8443`    → `https://example.com:8443/.well-known/did.json`
 *
 * v0 is HTTPS-only and refuses any non-HTTPS URL synthesized from the
 * DID. Localhost is allowed for tests when the resolver is constructed
 * with `allowHttp: true`.
 *
 * The resolver does NOT cache. The `SnapshotVerifier` that uses it
 * caches by operator DID for the lifetime of a snapshot, which is
 * sufficient for v0 — operators don't rotate keys mid-fetch.
 */
export interface DidWebResolverConfig {
  /** Test-only escape hatch to allow `http://` for did:web URLs (e.g. localhost). */
  allowHttp?: boolean;

  /** Override the global `fetch` for tests. */
  fetch?: typeof globalThis.fetch;
}

export class DidWebResolver {
  constructor(private readonly config: DidWebResolverConfig = {}) {}

  async resolve(did: string): Promise<DidDocument> {
    const url = didWebToUrl(did, this.config.allowHttp ?? false);
    const fetcher = this.config.fetch ?? globalThis.fetch;
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        `did:web resolution failed: ${response.status} ${response.statusText} for ${url}`,
      );
    }
    const doc = (await response.json()) as DidDocument;
    if (typeof doc?.id !== 'string') {
      throw new Error(`did:web document missing or invalid "id" field`);
    }
    if (doc.id !== did) {
      throw new Error(
        `did:web document id mismatch: expected "${did}", got "${doc.id}"`,
      );
    }
    return doc;
  }
}

/**
 * Translates a `did:web` URI to its HTTPS URL per the did-web spec.
 * Exported for tests; production callers should go through the
 * resolver.
 */
export function didWebToUrl(did: string, allowHttp: boolean): string {
  if (!did.startsWith('did:web:')) {
    throw new Error(`not a did:web URI: ${did}`);
  }
  const segments = did.slice('did:web:'.length).split(':');
  if (segments.length === 0 || segments[0] === '') {
    throw new Error(`did:web URI is missing a host: ${did}`);
  }
  const host = decodeURIComponent(segments[0]);
  const path =
    segments.length === 1
      ? '/.well-known/did.json'
      : '/' + segments.slice(1).map(decodeURIComponent).join('/') + '/did.json';

  // For localhost (test environments), allow http when explicitly opted
  // in. Any other host MUST be https.
  const protocol = (() => {
    if (!allowHttp) return 'https';
    if (host === 'localhost' || host.startsWith('127.0.0.1')) return 'http';
    if (host.endsWith(':localhost')) return 'http';
    return 'https';
  })();
  return `${protocol}://${host}${path}`;
}
