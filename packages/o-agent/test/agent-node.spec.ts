import { expect } from 'chai';
import { oAddress } from '@olane/o-core';
import { AgentNode } from '../src/agent/agent-node.tool.js';
import {
  InboxMessage,
  TaskState,
} from '../src/interfaces/inbox-message.js';
import type { AgentCard } from '../src/interfaces/agent-card.js';

/**
 * AgentNode unit tests — inbox / receive / drain / read / list / status.
 * `send` is exercised via a mocked `use()` so we don't need a leader to
 * route the receive call. These are method-body tests; the integration
 * with a real OS leader is exercised in the @olane/os smoke-test PR
 * (PR 5/5).
 */

const ADDRESS = 'o://brendon/claude-code/1234';

function makeCard(overrides: Partial<AgentCard['olane']> = {}): AgentCard {
  return {
    name: 'test',
    url: ADDRESS,
    version: '1.0.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [{ id: 'code.read' }],
    olane: {
      kind: 'claude-code',
      sessionId: '1234',
      user: 'brendon',
      registeredAt: new Date().toISOString(),
      ...overrides,
    },
  };
}

function makeNode(overrides: Partial<{ inboxBound: number }> = {}): AgentNode {
  return new AgentNode({
    parent: null,
    leader: null,
    address: new oAddress(ADDRESS),
    card: makeCard(),
    autoRegister: false,
    ...overrides,
  } as any);
}

async function call(
  node: AgentNode,
  method: string,
  params: Record<string, unknown> = {},
): Promise<any> {
  const fn = (node as any)[`_tool_${method}`].bind(node);
  return fn({ params });
}

function makeEnvelope(overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id: overrides.id ?? `msg_${Math.random().toString(36).slice(2)}`,
    from: overrides.from ?? 'o://brendon/codex/0001',
    to: overrides.to ?? ADDRESS,
    sentAt: overrides.sentAt ?? new Date().toISOString(),
    parts: overrides.parts ?? [{ kind: 'text', text: 'hello' }],
    task: overrides.task,
    correlationId: overrides.correlationId,
  };
}

describe('AgentNode', () => {
  describe('get_card / get_status', () => {
    it('get_card returns the card', async () => {
      const node = makeNode();
      const result = await call(node, 'get_card');
      expect(result.card.url).to.equal(ADDRESS);
      expect(result.card.olane.kind).to.equal('claude-code');
    });

    it('get_status reflects address + inbox state', async () => {
      const node = makeNode();
      const empty = await call(node, 'get_status');
      expect(empty.inboxDepth).to.equal(0);
      expect(empty.kind).to.equal('claude-code');
      expect(empty.sessionId).to.equal('1234');

      node._testOnlyEnqueue(makeEnvelope());
      const withOne = await call(node, 'get_status');
      expect(withOne.inboxDepth).to.equal(1);
    });
  });

  describe('receive', () => {
    it('receive deposits the envelope and returns ack', async () => {
      const node = makeNode();
      const env = makeEnvelope({ id: 'msg_abc' });
      const ack = await call(node, 'receive', { message: env });
      expect(ack.ok).to.equal(true);
      expect(ack.messageId).to.equal('msg_abc');
      expect(ack.inboxDepth).to.equal(1);
    });

    it('receive throws on malformed envelope', async () => {
      const node = makeNode();
      try {
        await call(node, 'receive', { message: { id: 'x' } });
        expect.fail('expected throw');
      } catch (err: any) {
        expect(err.message).to.match(/from\/to/);
      }
    });

    it('receive enforces the bound by dropping the oldest', async () => {
      const node = makeNode({ inboxBound: 3 });
      for (let i = 0; i < 5; i++) {
        await call(node, 'receive', {
          message: makeEnvelope({ id: `msg_${i}` }),
        });
      }
      const snapshot = node._testOnlyInboxSnapshot();
      expect(snapshot).to.have.length(3);
      expect(snapshot[0].id).to.equal('msg_2');
      expect(snapshot[2].id).to.equal('msg_4');
    });
  });

  describe('list_inbox / read_message', () => {
    it('list_inbox returns id summary, read_message returns full envelope', async () => {
      const node = makeNode();
      node._testOnlyEnqueue(makeEnvelope({ id: 'msg_1', from: 'o://a/x/1' }));
      node._testOnlyEnqueue(
        makeEnvelope({
          id: 'msg_2',
          task: { id: 't1', state: TaskState.WORKING },
        }),
      );

      const list = await call(node, 'list_inbox');
      expect(list.count).to.equal(2);
      expect(list.messages[0]).to.have.property('id');
      expect(list.messages[0]).to.have.property('from');
      expect(list.messages[0]).to.have.property('sentAt');
      expect(list.messages[1].taskState).to.equal('working');

      const read = await call(node, 'read_message', { id: 'msg_2' });
      expect(read.found).to.equal(true);
      expect(read.message.task.id).to.equal('t1');
    });

    it('read_message returns found=false on miss', async () => {
      const node = makeNode();
      const result = await call(node, 'read_message', { id: 'nope' });
      expect(result.found).to.equal(false);
      expect(result.id).to.equal('nope');
    });

    it('read_message throws on missing id', async () => {
      const node = makeNode();
      try {
        await call(node, 'read_message', {});
        expect.fail('expected throw');
      } catch (err: any) {
        expect(err.message).to.match(/id/);
      }
    });
  });

  describe('drain_inbox', () => {
    it('drain returns all messages and empties the inbox', async () => {
      const node = makeNode();
      node._testOnlyEnqueue(makeEnvelope({ id: 'msg_1' }));
      node._testOnlyEnqueue(makeEnvelope({ id: 'msg_2' }));
      node._testOnlyEnqueue(makeEnvelope({ id: 'msg_3' }));

      const drained = await call(node, 'drain_inbox');
      expect(drained.count).to.equal(3);
      expect(drained.messages.map((m: any) => m.id)).to.deep.equal([
        'msg_1',
        'msg_2',
        'msg_3',
      ]);

      expect(node._testOnlyInboxSnapshot()).to.have.length(0);

      const empty = await call(node, 'drain_inbox');
      expect(empty.count).to.equal(0);
    });
  });

  describe('send', () => {
    it('send constructs an envelope and dispatches to <to>/receive', async () => {
      const node = makeNode();
      // Mock node.use() so we capture the outbound call without needing
      // a real leader.
      const calls: Array<{ address: string; params: any }> = [];
      (node as any).use = async (addr: oAddress, params: any) => {
        calls.push({ address: addr.toString(), params });
        return { result: { success: true, data: { ok: true } } };
      };

      const result = await call(node, 'send', {
        to: 'o://brendon/codex/0001',
        parts: [{ kind: 'text', text: 'ping' }],
        correlation_id: 'corr-1',
      });

      expect(result.delivered).to.equal(true);
      expect(result.messageId).to.match(/^msg_/);
      expect(calls).to.have.length(1);
      expect(calls[0].address).to.equal('o://brendon/codex/0001/receive');
      expect(calls[0].params.method).to.equal('receive');
      const env = calls[0].params.params.message as InboxMessage;
      expect(env.from).to.equal(ADDRESS);
      expect(env.to).to.equal('o://brendon/codex/0001');
      expect(env.parts[0]).to.deep.equal({ kind: 'text', text: 'ping' });
      expect(env.correlationId).to.equal('corr-1');
    });

    it('send throws on missing parts', async () => {
      const node = makeNode();
      try {
        await call(node, 'send', { to: 'o://x/y/1', parts: [] });
        expect.fail('expected throw');
      } catch (err: any) {
        expect(err.message).to.match(/parts/);
      }
    });

    it('send threads task_id + task_state into the envelope', async () => {
      const node = makeNode();
      let captured: InboxMessage | undefined;
      (node as any).use = async (_addr: oAddress, params: any) => {
        captured = params.params.message;
        return { result: { success: true } };
      };
      await call(node, 'send', {
        to: 'o://brendon/codex/0001',
        parts: [{ kind: 'text', text: 'go' }],
        task_id: 't1',
        task_state: TaskState.WORKING,
      });
      expect(captured?.task?.id).to.equal('t1');
      expect(captured?.task?.state).to.equal('working');
    });
  });
});
