import { oMethod } from '@olane/o-protocol';

export const OS_CONFIG_METHODS: Record<string, oMethod> = {
  save_config: {
    name: 'save_config',
    description: 'Save OS instance configuration to storage',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance',
        required: true,
      },
      {
        name: 'config',
        type: 'object',
        value: 'object',
        description: 'OS instance configuration object',
        required: true,
      },
    ],
  },
  load_config: {
    name: 'load_config',
    description: 'Load OS instance configuration from storage',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance',
        required: true,
      },
    ],
  },
  list_configs: {
    name: 'list_configs',
    description: 'List all OS instance configurations',
    dependencies: [],
    parameters: [],
  },
  delete_config: {
    name: 'delete_config',
    description: 'Delete OS instance configuration',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance to delete',
        required: true,
      },
    ],
  },
  add_lane_to_config: {
    name: 'add_lane_to_config',
    description: 'Add a lane CID to the OS instance startup configuration',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance',
        required: true,
      },
      {
        name: 'cid',
        type: 'string',
        value: 'string',
        description: 'Content ID of the lane to add',
        required: true,
      },
    ],
  },
  remove_lane_from_config: {
    name: 'remove_lane_from_config',
    description: 'Remove a lane CID from the OS instance startup configuration',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance',
        required: true,
      },
      {
        name: 'cid',
        type: 'string',
        value: 'string',
        description: 'Content ID of the lane to remove',
        required: true,
      },
    ],
  },
  get_lanes: {
    name: 'get_lanes',
    description: 'Get all lane CIDs for an OS instance',
    dependencies: [],
    parameters: [
      {
        name: 'osName',
        type: 'string',
        value: 'string',
        description: 'Name of the OS instance',
        required: true,
      },
    ],
  },
};
