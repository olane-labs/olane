import { oMethod } from '@olane/o-protocol';

export const APPROVAL_METHODS: { [key: string]: oMethod } = {
  request_approval: {
    name: 'request_approval',
    description: 'Request human approval for an AI action',
    parameters: [
      {
        name: 'toolAddress',
        type: 'string',
        description: 'The address of the tool to be called',
        required: true,
      },
      {
        name: 'method',
        type: 'string',
        description: 'The method name to be called',
        required: true,
      },
      {
        name: 'params',
        type: 'object',
        description: 'The parameters for the method call',
        required: true,
      },
      {
        name: 'intent',
        type: 'string',
        description: 'The original intent that triggered this action',
        required: false,
      },
    ],
    dependencies: [],
  },
  set_preference: {
    name: 'set_preference',
    description: 'Store an approval preference (whitelist/blacklist)',
    parameters: [
      {
        name: 'toolMethod',
        type: 'string',
        description: 'The tool/method combination (e.g., "o://storage/delete")',
        required: true,
      },
      {
        name: 'preference',
        type: 'string',
        description: 'The preference type: "allow" or "deny"',
        required: true,
      },
    ],
    dependencies: [],
  },
  get_mode: {
    name: 'get_mode',
    description: 'Get the current approval mode',
    parameters: [],
    dependencies: [],
  },
  set_mode: {
    name: 'set_mode',
    description: 'Set the approval mode',
    parameters: [
      {
        name: 'mode',
        type: 'string',
        description: 'The approval mode: "allow", "review", or "auto"',
        required: true,
      },
    ],
    dependencies: [],
  },
};
