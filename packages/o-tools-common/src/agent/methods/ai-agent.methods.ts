import { oMethod } from '@olane/o-protocol';

export const AI_AGENT_PARAMS: { [key: string]: oMethod } = {
  send_message: {
    name: 'send_message',
    description: 'Send a message to another agent in the network',
    dependencies: [],
    parameters: [
      {
        name: 'recipient',
        type: 'string',
        value: 'string',
        description:
          'The agent recipient identifier (e.g., address, ID, or name)',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        value: 'string',
        description: 'The message content to send to the agent',
        required: true,
      },
      {
        name: 'priority',
        type: 'string',
        value: 'string',
        description: 'Message priority level: low, normal, high, urgent',
        required: false,
      },
      {
        name: 'messageType',
        type: 'string',
        value: 'string',
        description: 'Type of message: notification, request, alert, info',
        required: false,
      },
      {
        name: 'requiresResponse',
        type: 'boolean',
        value: 'boolean',
        description: 'Whether this message requires a response from the agent',
        required: false,
      },
    ],
  },
  broadcast_message: {
    name: 'broadcast_message',
    description: 'Broadcast a message to all agents in the network',
    dependencies: [],
    parameters: [
      {
        name: 'message',
        type: 'string',
        value: 'string',
        description: 'The message content to broadcast to all agents',
        required: true,
      },
      {
        name: 'priority',
        type: 'string',
        value: 'string',
        description: 'Message priority level: low, normal, high, urgent',
        required: false,
      },
      {
        name: 'messageType',
        type: 'string',
        value: 'string',
        description: 'Type of message: notification, announcement, alert, info',
        required: false,
      },
      {
        name: 'targetType',
        type: 'string',
        value: 'string',
        description: 'Target agent type: human, ai, or all',
        required: false,
      },
    ],
  },
  get_agents: {
    name: 'get_agents',
    description: 'Get a list of available agents in the network',
    dependencies: [],
    parameters: [
      {
        name: 'status',
        type: 'string',
        value: 'string',
        description: 'Filter by agent status: online, offline, available, busy',
        required: false,
      },
      {
        name: 'type',
        type: 'string',
        value: 'string',
        description: 'Filter by agent type: human, ai',
        required: false,
      },
    ],
  },
  process_task: {
    name: 'process_task',
    description: 'Process a task using AI capabilities',
    dependencies: [],
    parameters: [
      {
        name: 'task',
        type: 'string',
        value: 'string',
        description: 'The task to process',
        required: true,
      },
      {
        name: 'context',
        type: 'string',
        value: 'string',
        description: 'Additional context for the task',
        required: false,
      },
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'Specific AI model to use for processing',
        required: false,
      },
    ],
  },
};
