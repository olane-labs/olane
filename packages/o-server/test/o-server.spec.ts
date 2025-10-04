/**
 * Basic tests for o-server
 */

import { oServer } from '../src/index.js';
import { OlaneOS } from '@olane/o-os';
import { NodeType, oAddress } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oRequest } from '@olane/o-core';

// Mock tool node for testing
class TestNode extends oLaneTool {
  constructor(config: any) {
    super({
      ...config,
      address: new oAddress('o://test'),
      description: 'Test node',
    });
  }

  async _tool_echo(request: oRequest) {
    return { message: request.params.message };
  }

  _params_echo() {
    return {
      message: { type: 'string', required: true },
    };
  }
}

describe('o-server', () => {
  let os: OlaneOS;
  let server: any;

  beforeAll(async () => {
    // Create OS instance
    os = new OlaneOS({
      nodes: [
        {
          type: NodeType.LEADER,
          address: new oAddress('o://leader'),
          leader: null,
          parent: null,
        },
      ],
    });

    await os.start();

    // Add test node
    const testNode = new TestNode({
      leader: os.rootLeader?.address,
      parent: os.rootLeader?.address,
    });
    await testNode.start();
    await os.addNode(testNode);

    // Create server
    server = oServer({
      os,
      port: 3001,
      debug: false,
    });

    await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    if (os) {
      await os.stop();
    }
  });

  it('should create a server instance', () => {
    expect(server).toBeDefined();
    expect(server.app).toBeDefined();
    expect(server.start).toBeDefined();
    expect(server.stop).toBeDefined();
  });

  it('should export required types', () => {
    const { oServer } = require('../src/index.js');
    expect(oServer).toBeDefined();
  });

  // Additional tests can be added here for:
  // - Health check endpoint
  // - Node discovery endpoint
  // - Tool calling endpoint
  // - Intent endpoint
  // - Streaming endpoint
  // - Error handling
  // - Authentication
});
