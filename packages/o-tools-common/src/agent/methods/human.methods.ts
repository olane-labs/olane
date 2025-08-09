import { oMethod } from '@olane/o-protocol';

export const HUMAN_PARAMS: { [key: string]: oMethod } = {
  send_message: {
    name: 'send_message',
    description: 'Send a message to a human in the network',
    dependencies: [],
    parameters: [
      {
        name: 'recipient',
        type: 'string',
        value: 'string',
        description:
          'The human recipient identifier (e.g., address, ID, or name)',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        value: 'string',
        description: 'The message content to send to the human',
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
        description: 'Whether this message requires a response from the human',
        required: false,
      },
    ],
  },
  broadcast_message: {
    name: 'broadcast_message',
    description: 'Broadcast a message to all humans in the network',
    dependencies: [],
    parameters: [
      {
        name: 'message',
        type: 'string',
        value: 'string',
        description: 'The message content to broadcast to all humans',
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
    ],
  },
  get_humans: {
    name: 'get_humans',
    description: 'Get a list of available humans in the network',
    dependencies: [],
    parameters: [
      {
        name: 'status',
        type: 'string',
        value: 'string',
        description: 'Filter by human status: online, offline, available, busy',
        required: false,
      },
    ],
  },
};
