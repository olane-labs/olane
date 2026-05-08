import { oAddress } from '@olane/o-core';
import { expect } from 'chai';
import { oAgentResolver } from '../src/router/agent.resolver.js';

/**
 * Unit tests for `oAgentResolver.parseSubPath`. These are pure-function
 * tests — no leader/node startup required — covering each sub-path shape
 * called out in ADR 0001 (PR 2/5) plus a few defensive cases.
 */

const CANONICAL = 'o://brendon/claude-code/1234';
const node = { address: new oAddress(CANONICAL) };

function parse(path: string) {
  const resolver = new oAgentResolver(node.address);
  return resolver.parseSubPath(new oAddress(path), node);
}

describe('oAgentResolver.parseSubPath', () => {
  it('bare canonical address resolves to route_to_self', () => {
    const { method, params } = parse(CANONICAL);
    expect(method).to.equal('route_to_self');
    expect(params).to.deep.equal({});
  });

  it('/inbox → list_inbox', () => {
    const { method, params } = parse(`${CANONICAL}/inbox`);
    expect(method).to.equal('list_inbox');
    expect(params).to.deep.equal({});
  });

  it('/inbox/<id> → read_message with id param', () => {
    const { method, params } = parse(`${CANONICAL}/inbox/msg_01HXYZ`);
    expect(method).to.equal('read_message');
    expect(params).to.deep.equal({ id: 'msg_01HXYZ' });
  });

  it('/send → send', () => {
    const { method, params } = parse(`${CANONICAL}/send`);
    expect(method).to.equal('send');
    expect(params).to.deep.equal({});
  });

  it('/receive → receive', () => {
    const { method, params } = parse(`${CANONICAL}/receive`);
    expect(method).to.equal('receive');
    expect(params).to.deep.equal({});
  });

  it('/drain → drain_inbox', () => {
    const { method, params } = parse(`${CANONICAL}/drain`);
    expect(method).to.equal('drain_inbox');
    expect(params).to.deep.equal({});
  });

  it('/card → get_card', () => {
    const { method, params } = parse(`${CANONICAL}/card`);
    expect(method).to.equal('get_card');
    expect(params).to.deep.equal({});
  });

  it('/status → get_status', () => {
    const { method, params } = parse(`${CANONICAL}/status`);
    expect(method).to.equal('get_status');
    expect(params).to.deep.equal({});
  });

  it('unknown sub-path falls through to method=<segment>', () => {
    const { method, params } = parse(`${CANONICAL}/cancel/task-123`);
    expect(method).to.equal('cancel');
    expect(params).to.deep.equal({ key: 'task-123' });
  });

  it('multi-segment tail collapses to { path: [...] }', () => {
    const { method, params } = parse(`${CANONICAL}/inbox/msg_01H/replies/2`);
    // /inbox/<id> short-circuits before the multi-segment branch is exercised
    expect(method).to.equal('read_message');
    expect(params).to.deep.equal({ id: 'msg_01H' });
  });

  it('non-inbox multi-tail collapses to { path: [...] }', () => {
    const { method, params } = parse(`${CANONICAL}/futureverb/a/b/c`);
    expect(method).to.equal('futureverb');
    expect(params).to.deep.equal({ path: ['a', 'b', 'c'] });
  });

  it('trailing slash is tolerated', () => {
    const { method } = parse(`${CANONICAL}/inbox/`);
    expect(method).to.equal('list_inbox');
  });
});
