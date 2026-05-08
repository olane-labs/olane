import { oMethod } from '@olane/o-protocol';

/**
 * Tool method metadata for `AgentNode` — one per running coding-agent
 * session at `o://<user>/<kind>/<session-id>`. Mirrors the
 * `@olane/o-storage` external-metadata convention.
 */
export const AGENT_NODE_METHODS: { [key: string]: oMethod } = {
  get_card: {
    name: 'get_card',
    description: 'Return the A2A-shaped capability card for this agent.',
    dependencies: [],
    parameters: [],
  },
  get_status: {
    name: 'get_status',
    description: 'Return liveness + inbox depth.',
    dependencies: [],
    parameters: [],
  },
  list_inbox: {
    name: 'list_inbox',
    description: 'List ids + sender + sent_at of all pending messages.',
    dependencies: [],
    parameters: [],
  },
  read_message: {
    name: 'read_message',
    description: 'Read a single inbox message by id.',
    dependencies: [],
    parameters: [
      {
        name: 'id',
        type: 'string',
        value: 'string',
        description: 'Message id',
        required: true,
      },
    ],
  },
  send: {
    name: 'send',
    description:
      'Send a message FROM this agent to another address. Used by the agent itself or by a CLI tool speaking on its behalf.',
    dependencies: [],
    parameters: [
      {
        name: 'to',
        type: 'string',
        value: 'string',
        description: 'Recipient olane address',
        required: true,
      },
      {
        name: 'parts',
        type: 'array',
        value: 'array',
        description: 'A2A-shaped MessagePart[]',
        required: true,
      },
      {
        name: 'task_id',
        type: 'string',
        value: 'string',
        description: 'Task correlation id (optional)',
        required: false,
      },
      {
        name: 'task_state',
        type: 'string',
        value: 'string',
        description: 'A2A TaskState (optional)',
        required: false,
      },
      {
        name: 'correlation_id',
        type: 'string',
        value: 'string',
        description: 'Caller-supplied correlation id (optional)',
        required: false,
      },
    ],
  },
  receive: {
    name: 'receive',
    description:
      "Inbound deposit — drop a message INTO this agent's inbox. Called by other agents or the broker.",
    dependencies: [],
    parameters: [
      {
        name: 'message',
        type: 'object',
        value: 'object',
        description: 'Full InboxMessage envelope',
        required: true,
      },
    ],
  },
  drain_inbox: {
    name: 'drain_inbox',
    description:
      "Atomically read and remove all pending inbox messages. Used by the Stop hook to flush messages into Claude's additionalContext.",
    dependencies: [],
    parameters: [],
  },
};
