import {
  DidWebResolver,
  didWebToUrl,
} from '../../src/did/did-web-resolver.js';

describe('didWebToUrl', () => {
  test('bare host → /.well-known/did.json', () => {
    expect(didWebToUrl('did:web:example.com', false)).toBe(
      'https://example.com/.well-known/did.json',
    );
  });

  test('host + path → /<path>/did.json', () => {
    expect(didWebToUrl('did:web:example.com:user:alice', false)).toBe(
      'https://example.com/user/alice/did.json',
    );
  });

  test('percent-encoded port survives translation', () => {
    expect(didWebToUrl('did:web:example.com%3A8443', false)).toBe(
      'https://example.com:8443/.well-known/did.json',
    );
  });

  test('refuses non-did:web input', () => {
    expect(() => didWebToUrl('did:plc:abc', false)).toThrow(/not a did:web/);
  });

  test('localhost gets http when allowHttp is true (test mode)', () => {
    expect(didWebToUrl('did:web:localhost', true)).toBe(
      'http://localhost/.well-known/did.json',
    );
  });

  test('localhost stays https when allowHttp is false', () => {
    expect(didWebToUrl('did:web:localhost', false)).toBe(
      'https://localhost/.well-known/did.json',
    );
  });
});

describe('DidWebResolver', () => {
  test('fetches and returns the DID document', async () => {
    const doc = {
      id: 'did:web:example.com',
      verificationMethod: [],
    };
    const resolver = new DidWebResolver({
      fetch: async () =>
        new Response(JSON.stringify(doc), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const result = await resolver.resolve('did:web:example.com');
    expect(result.id).toBe('did:web:example.com');
  });

  test('throws if the response is non-2xx', async () => {
    const resolver = new DidWebResolver({
      fetch: async () => new Response('not found', { status: 404 }),
    });
    await expect(resolver.resolve('did:web:example.com')).rejects.toThrow(
      /404/,
    );
  });

  test('throws if the document id does not match the requested DID', async () => {
    const resolver = new DidWebResolver({
      fetch: async () =>
        new Response(JSON.stringify({ id: 'did:web:other.example.com' }), {
          status: 200,
        }),
    });
    await expect(resolver.resolve('did:web:example.com')).rejects.toThrow(
      /document id mismatch/,
    );
  });
});
