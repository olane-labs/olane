import { AgentKind } from './agent-kind.js';

/**
 * A2A-shaped capability descriptor advertised by an `AgentNode`.
 *
 * Mirrors the public Google A2A `AgentCard` schema (v1.x) so a future
 * `o://a2a-bridge` HTTP node can serve `/.well-known/agent.json` from
 * this object with no remapping. Phase-1 cards are unsigned; signing is
 * tracked for a later phase.
 */
export interface AgentCard {
  /** Stable display name for humans (e.g. "Claude Code — session 1234"). */
  name: string;

  /** Free-form description shown to callers when discovering this agent. */
  description?: string;

  /** Olane address that hosts this agent, e.g. `o://brendon/claude-code/1234`. */
  url: string;

  /** Provider metadata (organization or runtime hosting the agent). */
  provider?: {
    organization?: string;
    url?: string;
  };

  /** Card schema version — bump when fields change. */
  version: string;

  /** Capability flags. */
  capabilities: {
    /** Whether the agent supports streamed message delivery. */
    streaming: boolean;
    /** Whether the agent supports push notifications back to the caller. */
    pushNotifications: boolean;
    /** Whether the agent's task lifecycle is observable by the caller. */
    stateTransitionHistory: boolean;
  };

  /** Default content type for inbox messages (matches A2A `Part.kind`). */
  defaultInputModes: string[];
  defaultOutputModes: string[];

  /**
   * Skills the agent advertises. Each skill is an opaque string identifier
   * (e.g. `code.edit`) plus optional human-readable metadata.
   */
  skills: AgentSkill[];

  /** Olane-specific extensions that don't appear in vanilla A2A. */
  olane: {
    kind: AgentKind | string;
    sessionId: string;
    /** OS user the session belongs to (used in the address path). */
    user: string;
    /** Process ID of the registering shell-out — used for liveness GC. */
    registeringPid?: number;
    /** ISO 8601 timestamp when the session registered. */
    registeredAt: string;
  };
}

export interface AgentSkill {
  id: string;
  name?: string;
  description?: string;
  /** Sample inputs / examples the agent has handled. Free-form. */
  examples?: string[];
  /** Tags for grouping / filtering during discovery. */
  tags?: string[];
}
