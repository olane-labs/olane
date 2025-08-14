import { oMethod } from '@olane/o-protocol';

export const ENCRYPTION_PARAMS: { [key: string]: oMethod } = {
  encrypt: {
    name: 'encrypt',
    description: 'Encrypt value prior to storing in the vault',
    dependencies: [],
    parameters: [
      {
        name: 'value',
        type: 'string',
        value: 'string',
        description: 'The value to encrypt',
        required: true,
      },
    ],
  },
  decrypt: {
    name: 'decrypt',
    description: 'Decrypt value prior to retrieving from the vault',
    dependencies: [],
    parameters: [
      {
        name: 'value',
        type: 'string',
        value: 'string',
        description: 'The value to decrypt',
        required: true,
      },
    ],
  },
};
