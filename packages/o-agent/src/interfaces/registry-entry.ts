import { AgentCard } from './agent-card.js';

/**
 * One row in the `o://agents` registry. Returned by `AgentRegistryNode.list`
 * and consumed by `copass olane list` / the `list_agents` MCP tool.
 */
export interface RegistryEntry {
  /** Canonical olane address of the agent — primary key. */
  address: string;

  /** Full A2A-shaped card the agent advertised at registration time. */
  card: AgentCard;

  /** ISO 8601 timestamp of the most recent heartbeat from the AgentNode. */
  lastHeartbeatAt: string;

  /**
   * Process id of the shell-out that registered (typically the Claude Code
   * hook process). Used by the registry sweep to detect crashed sessions
   * via `process.kill(pid, 0)`.
   */
  registeringPid?: number;

  /** Whether the entry passed the most recent liveness sweep. */
  live: boolean;
}
