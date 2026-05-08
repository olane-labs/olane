/**
 * Known kinds of coding agents that can register a session on the local
 * Olane OS. The string value is used as the `<kind>` segment in the address
 * `o://<user>/<kind>/<session-id>`, so it must be address-safe (lowercase,
 * hyphenated, no slashes).
 */
export enum AgentKind {
  CLAUDE_CODE = 'claude-code',
  CODEX = 'codex',
  /** Generic fallback for agents that don't have a dedicated kind yet. */
  GENERIC = 'agent',
}

export interface AgentKindMetadata {
  /** Human-readable name shown in `copass olane list`. */
  displayName: string;
  /** Default address segment (matches the enum value). */
  segment: string;
  /**
   * Skills the agent kind is *expected* to advertise. Individual sessions
   * may override their card. Mirrors A2A's skill descriptor shape so a
   * future a2a-bridge node can republish without remapping.
   */
  defaultSkills: string[];
}

export const AGENT_KIND_METADATA: Record<AgentKind, AgentKindMetadata> = {
  [AgentKind.CLAUDE_CODE]: {
    displayName: 'Claude Code',
    segment: 'claude-code',
    defaultSkills: ['code.read', 'code.edit', 'shell.exec'],
  },
  [AgentKind.CODEX]: {
    displayName: 'Codex',
    segment: 'codex',
    defaultSkills: ['code.read', 'code.edit', 'shell.exec'],
  },
  [AgentKind.GENERIC]: {
    displayName: 'Generic Agent',
    segment: 'agent',
    defaultSkills: [],
  },
};

export function isKnownAgentKind(value: string): value is AgentKind {
  return Object.values(AgentKind).includes(value as AgentKind);
}
