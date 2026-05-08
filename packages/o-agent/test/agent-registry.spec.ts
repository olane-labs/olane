import { expect } from 'chai';
import { AgentRegistryNode } from '../src/registry/agent-registry.tool.js';
import type { AgentCard } from '../src/interfaces/agent-card.js';

/**
 * Unit tests for `AgentRegistryNode`. We exercise the `_tool_*` methods
 * directly so the suite stays a fast pure-function test (no leader
 * startup, no libp2p). Liveness behavior is covered by simulating
 * timestamp drift on the in-memory entries.
 */

function makeCard(overrides: Partial<AgentCard['olane']> = {}): AgentCard {
  return {
    name: 'test-agent',
    url: `o://brendon/${overrides.kind ?? 'claude-code'}/${overrides.sessionId ?? '1234'}`,
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
      kind: overrides.kind ?? 'claude-code',
      sessionId: overrides.sessionId ?? '1234',
      user: overrides.user ?? 'brendon',
      registeredAt: new Date().toISOString(),
      ...overrides,
    },
  };
}

function makeRegistry(): AgentRegistryNode {
  // The registry depends on oNodeConfig for parent/leader plumbing, but
  // the _tool_* method bodies don't touch any of that — we can construct
  // it directly with a minimal config and call methods.
  return new AgentRegistryNode({
    parent: null,
    leader: null,
  } as any);
}

async function call(
  registry: AgentRegistryNode,
  method: string,
  params: Record<string, unknown> = {},
): Promise<any> {
  // _tool_* signatures expect an oRequest, but the bodies only touch
  // request.params. A duck-typed object is enough for unit tests.
  const fn = (registry as any)[`_tool_${method}`].bind(registry);
  return fn({ params });
}

describe('AgentRegistryNode', () => {
  describe('register / deregister / list', () => {
    it('register adds an entry, list returns it', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1234',
        card: makeCard(),
        registeringPid: process.pid,
      });

      const result = await call(registry, 'list');
      expect(result.count).to.equal(1);
      expect(result.entries[0].address).to.equal(
        'o://brendon/claude-code/1234',
      );
      expect(result.entries[0].live).to.equal(true);
      expect(result.entries[0].registeringPid).to.equal(process.pid);
    });

    it('deregister removes the entry', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1234',
        card: makeCard(),
      });
      const dereg = await call(registry, 'deregister', {
        address: 'o://brendon/claude-code/1234',
      });
      expect(dereg.wasRegistered).to.equal(true);

      const result = await call(registry, 'list');
      expect(result.count).to.equal(0);
    });

    it('register without address or card throws', async () => {
      const registry = makeRegistry();
      try {
        await call(registry, 'register', { address: 'o://x' });
        expect.fail('expected throw');
      } catch (err: any) {
        expect(err.message).to.match(/address.*card/);
      }
    });
  });

  describe('list filters', () => {
    it('filters by kind', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard({ kind: 'claude-code', sessionId: '1' }),
      });
      await call(registry, 'register', {
        address: 'o://brendon/codex/2',
        card: makeCard({ kind: 'codex', sessionId: '2' }),
      });

      const claude = await call(registry, 'list', { kind: 'claude-code' });
      expect(claude.count).to.equal(1);
      expect(claude.entries[0].card.olane.kind).to.equal('claude-code');

      const codex = await call(registry, 'list', { kind: 'codex' });
      expect(codex.count).to.equal(1);
      expect(codex.entries[0].card.olane.kind).to.equal('codex');
    });

    it('filters by user', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard({ user: 'brendon', sessionId: '1' }),
      });
      await call(registry, 'register', {
        address: 'o://other/claude-code/2',
        card: makeCard({ user: 'other', sessionId: '2' }),
      });

      const brendon = await call(registry, 'list', { user: 'brendon' });
      expect(brendon.count).to.equal(1);
      expect(brendon.entries[0].card.olane.user).to.equal('brendon');
    });
  });

  describe('heartbeat', () => {
    it('bumps lastHeartbeatAt', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard(),
      });
      const before = (await call(registry, 'list')).entries[0]
        .lastHeartbeatAt;
      // Force a tick so the timestamps differ.
      await new Promise((r) => setTimeout(r, 5));
      const ack = await call(registry, 'heartbeat', {
        address: 'o://brendon/claude-code/1',
      });
      expect(ack.ok).to.equal(true);
      expect(ack.lastHeartbeatAt).to.not.equal(before);
    });

    it('returns ok=false for unknown agent (does not throw)', async () => {
      const registry = makeRegistry();
      const ack = await call(registry, 'heartbeat', {
        address: 'o://unknown/agent/0',
      });
      expect(ack.ok).to.equal(false);
      expect(ack.reason).to.equal('not-registered');
    });
  });

  describe('sweep', () => {
    it('marks an entry dead when last heartbeat older than TTL', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard(),
      });
      // Backdate the heartbeat by 2 minutes (TTL is 90s).
      const entries = (registry as any).entries as Map<string, any>;
      const entry = entries.get('o://brendon/claude-code/1');
      entry.lastHeartbeatAt = new Date(Date.now() - 120_000).toISOString();

      const summary = await call(registry, 'sweep');
      expect(summary.markedDead).to.equal(1);

      const list = await call(registry, 'list');
      expect(list.entries[0].live).to.equal(false);
    });

    it('removes an entry whose last heartbeat is older than 2x TTL', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard(),
      });
      const entries = (registry as any).entries as Map<string, any>;
      entries.get('o://brendon/claude-code/1').lastHeartbeatAt = new Date(
        Date.now() - 10 * 60_000,
      ).toISOString();

      const summary = await call(registry, 'sweep');
      expect(summary.removed).to.equal(1);

      const list = await call(registry, 'list');
      expect(list.count).to.equal(0);
    });

    it('removes a stale-PID entry once TTL elapses (PID dead branch)', async () => {
      const registry = makeRegistry();
      // PID 1 (init) is *alive*. Use a PID that is almost certainly
      // dead — pick a high random value and confirm it's dead first.
      let deadPid = 999_999;
      while (true) {
        try {
          process.kill(deadPid, 0);
          deadPid -= 1;
          if (deadPid < 100_000) break;
        } catch {
          break;
        }
      }
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard(),
        registeringPid: deadPid,
      });
      const entries = (registry as any).entries as Map<string, any>;
      entries.get('o://brendon/claude-code/1').lastHeartbeatAt = new Date(
        Date.now() - 2 * 60_000,
      ).toISOString();

      const summary = await call(registry, 'sweep');
      expect(summary.removed).to.equal(1);
    });

    it('keeps fresh entries alive', async () => {
      const registry = makeRegistry();
      await call(registry, 'register', {
        address: 'o://brendon/claude-code/1',
        card: makeCard(),
      });
      const summary = await call(registry, 'sweep');
      expect(summary.markedDead).to.equal(0);
      expect(summary.removed).to.equal(0);

      const list = await call(registry, 'list');
      expect(list.entries[0].live).to.equal(true);
    });
  });
});
