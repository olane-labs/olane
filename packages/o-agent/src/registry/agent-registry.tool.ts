import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { AgentCard } from '../interfaces/agent-card.js';
import { RegistryEntry } from '../interfaces/registry-entry.js';
import { AGENT_REGISTRY_METHODS } from '../methods/agent-registry.methods.js';

/**
 * Heartbeat / sweep parameters per ADR 0001 (decision D9). Tightening or
 * relaxing these is fine; they're internal to the registry and don't
 * change the public method shape.
 */
const HEARTBEAT_TTL_MS = 90_000;
const SWEEP_INTERVAL_MS = 60_000;

/**
 * `AgentRegistryNode` — directory of live agent sessions on the local OS.
 *
 * Mounted by `@olane/os` startup as a child of the root leader (PR 5/5
 * wires this in). NOT a parent of `AgentNode`s — those have flat
 * addresses (`o://<user>/<kind>/<session-id>`) directly under the leader.
 * The registry just *tracks* them.
 *
 * Methods:
 *  - register({ address, card, registeringPid? })  → returns ack
 *  - deregister({ address })                        → returns ack
 *  - heartbeat({ address })                         → bumps lastHeartbeatAt
 *  - list({ kind?, user?, live? })                  → filtered RegistryEntry[]
 *  - sweep()                                        → manual stale check
 *
 * Liveness GC runs on a 60s timer with a 90s TTL plus PID liveness
 * probe via `process.kill(pid, 0)` — PIDs only meaningful on the same
 * host, which is the Phase-1 trust boundary anyway.
 */
export class AgentRegistryNode extends oLaneTool {
  private entries: Map<string, RegistryEntry> = new Map();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(config: oNodeConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://agents'),
      description:
        'Directory of live agent sessions on the local Olane OS. Tracks AgentNode addresses, capability cards, and last-heartbeat timestamps.',
      methods: AGENT_REGISTRY_METHODS,
    });
  }

  /**
   * Lifecycle — start the sweep loop after the node is up. Using `start`
   * (not `initialize`) keeps the timer scoped to the running phase.
   */
  async start(): Promise<void> {
    await super.start();
    this.sweepTimer = setInterval(() => {
      this.sweep().catch((err) =>
        this.logger.warn('Agent registry sweep failed:', err),
      );
    }, SWEEP_INTERVAL_MS);
    // Don't keep the event loop alive solely for the sweep.
    this.sweepTimer.unref?.();
    this.logger.debug(
      `AgentRegistry started (TTL ${HEARTBEAT_TTL_MS}ms, sweep ${SWEEP_INTERVAL_MS}ms)`,
    );
  }

  async stop(): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.entries.clear();
    await super.stop();
  }

  async _tool_register(request: oRequest): Promise<ToolResult> {
    const { address, card, registeringPid } = request.params as any as {
      address: string;
      card: AgentCard;
      registeringPid?: number;
    };

    if (!address || !card) {
      throw new Error('register: `address` and `card` are required');
    }

    const now = new Date().toISOString();
    const entry: RegistryEntry = {
      address,
      card,
      lastHeartbeatAt: now,
      registeringPid,
      live: true,
    };
    this.entries.set(address, entry);
    this.logger.debug(
      `Registered agent ${address} (kind=${card.olane?.kind}, pid=${registeringPid ?? '-'})`,
    );
    return { ok: true, address, registeredAt: now };
  }

  async _tool_deregister(request: oRequest): Promise<ToolResult> {
    const { address } = request.params as any as { address: string };
    if (!address) {
      throw new Error('deregister: `address` is required');
    }
    const removed = this.entries.delete(address);
    this.logger.debug(
      `Deregister agent ${address} (was-registered=${removed})`,
    );
    return { ok: true, address, wasRegistered: removed };
  }

  async _tool_heartbeat(request: oRequest): Promise<ToolResult> {
    const { address } = request.params as any as { address: string };
    if (!address) {
      throw new Error('heartbeat: `address` is required');
    }
    const entry = this.entries.get(address);
    if (!entry) {
      // Heartbeat from an unknown agent — probably came in after a sweep
      // killed the entry. Surface an "unknown" result so the caller can
      // re-register cleanly. Don't throw: hooks can't recover from
      // exceptions.
      return { ok: false, address, reason: 'not-registered' };
    }
    entry.lastHeartbeatAt = new Date().toISOString();
    entry.live = true;
    return { ok: true, address, lastHeartbeatAt: entry.lastHeartbeatAt };
  }

  async _tool_list(request: oRequest): Promise<ToolResult> {
    const { kind, user, live } = (request.params || {}) as any as {
      kind?: string;
      user?: string;
      live?: boolean;
    };

    const all = Array.from(this.entries.values());
    const filtered = all.filter((entry) => {
      if (kind && entry.card.olane?.kind !== kind) return false;
      if (user && entry.card.olane?.user !== user) return false;
      if (live === true && !entry.live) return false;
      if (live === false && entry.live) return false;
      return true;
    });

    return {
      count: filtered.length,
      entries: filtered,
    };
  }

  async _tool_sweep(_request: oRequest): Promise<ToolResult> {
    const summary = await this.sweep();
    return summary;
  }

  /**
   * Internal sweep — also called by the interval timer. Marks entries
   * `live = false` if their last heartbeat is older than TTL OR their
   * registering PID is dead. Removes entries that have been non-live for
   * one full TTL window (i.e. dead at least 2× TTL — gives reconnect
   * a generous chance).
   */
  private async sweep(): Promise<{
    examined: number;
    markedDead: number;
    removed: number;
  }> {
    const now = Date.now();
    let markedDead = 0;
    let removed = 0;

    for (const [address, entry] of this.entries) {
      const ageMs = now - new Date(entry.lastHeartbeatAt).getTime();
      const pidDead =
        entry.registeringPid !== undefined && !this.isPidAlive(entry.registeringPid);

      if (ageMs > 2 * HEARTBEAT_TTL_MS || (pidDead && ageMs > HEARTBEAT_TTL_MS)) {
        this.entries.delete(address);
        removed += 1;
        this.logger.debug(
          `Sweep: removed ${address} (age=${ageMs}ms, pidDead=${pidDead})`,
        );
        continue;
      }

      const shouldBeDead = ageMs > HEARTBEAT_TTL_MS || pidDead;
      if (shouldBeDead && entry.live) {
        entry.live = false;
        markedDead += 1;
      } else if (!shouldBeDead && !entry.live) {
        entry.live = true;
      }
    }

    return {
      examined: this.entries.size + removed,
      markedDead,
      removed,
    };
  }

  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
