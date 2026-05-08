import { oMethod } from '@olane/o-protocol';

/**
 * Tool method metadata for `AgentRegistryNode` (mounted at `o://agents`).
 *
 * Pattern mirrors `@olane/o-storage`'s `STORAGE_PARAMS` export — keep the
 * descriptors in a dedicated file so the tool constructor stays a thin
 * wrapper that just wires methods to handlers.
 */
export const AGENT_REGISTRY_METHODS: { [key: string]: oMethod } = {
  register: {
    name: 'register',
    description: 'Register an agent session and its capability card.',
    dependencies: [],
    parameters: [
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'Canonical olane address of the AgentNode',
        required: true,
      },
      {
        name: 'card',
        type: 'object',
        value: 'object',
        description: 'A2A-shaped AgentCard for the session',
        required: true,
      },
      {
        name: 'registeringPid',
        type: 'number',
        value: 'number',
        description: 'PID of the registering process (used for liveness GC)',
        required: false,
      },
    ],
  },
  deregister: {
    name: 'deregister',
    description: 'Remove an agent session from the registry.',
    dependencies: [],
    parameters: [
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'Canonical olane address of the AgentNode',
        required: true,
      },
    ],
  },
  heartbeat: {
    name: 'heartbeat',
    description: 'Mark an agent session as still alive.',
    dependencies: [],
    parameters: [
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'Canonical olane address of the AgentNode',
        required: true,
      },
    ],
  },
  list: {
    name: 'list',
    description: 'List registered agent sessions, with optional filters.',
    dependencies: [],
    parameters: [
      {
        name: 'kind',
        type: 'string',
        value: 'string',
        description: 'Filter by agent kind (e.g. claude-code)',
        required: false,
      },
      {
        name: 'user',
        type: 'string',
        value: 'string',
        description: 'Filter by user segment',
        required: false,
      },
      {
        name: 'live',
        type: 'boolean',
        value: 'boolean',
        description:
          'If true, only return entries whose last heartbeat is fresher than TTL',
        required: false,
      },
    ],
  },
  sweep: {
    name: 'sweep',
    description:
      'Run a stale-entry sweep (also runs automatically on a 60s timer).',
    dependencies: [],
    parameters: [],
  },
};
