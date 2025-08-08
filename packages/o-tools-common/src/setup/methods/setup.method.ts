import { oMethod } from '@olane/o-protocol';

export const SETUP_METHODS: { [key: string]: oMethod } = {
  validate: {
    name: 'validate',
    description: 'Validate the setup of the tool',
    dependencies: [],
    parameters: [
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'The address of the tool to validate',
        required: false,
      },
    ],
  },
};
