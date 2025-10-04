/**
 * Basic o-server example
 *
 * This example demonstrates:
 * - Setting up an OlaneOS instance
 * - Creating an HTTP server with o-server
 * - Making REST API calls to tool nodes
 */

import { oServer } from '../index.js';
import { OlaneOS } from '@olane/o-os';
import { NodeType, oAddress } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oRequest } from '@olane/o-core';

// Example tool node
class CalculatorNode extends oLaneTool {
  constructor(config: any) {
    super({
      ...config,
      address: new oAddress('o://calculator'),
      description: 'Simple calculator tool',
    });
  }

  async _tool_add(request: oRequest) {
    const { a, b } = request.params as { a: number; b: number };
    return { result: a + b };
  }

  async _tool_subtract(request: oRequest) {
    const { a, b } = request.params as { a: number; b: number };
    return { result: a - b };
  }

  _params_add() {
    return {
      a: { type: 'number', required: true },
      b: { type: 'number', required: true },
    };
  }

  _params_subtract() {
    return {
      a: { type: 'number', required: true },
      b: { type: 'number', required: true },
    };
  }
}

async function main() {
  // Create OlaneOS instance with leader and calculator node
  const os = new OlaneOS({
    nodes: [
      {
        type: NodeType.LEADER,
        address: new oAddress('o://leader'),
        leader: null,
        parent: null,
      },
    ],
  });

  // Start the OS
  console.log('Starting Olane OS...');
  await os.start();

  // Add calculator node
  const calculator = new CalculatorNode({
    leader: os.rootLeader?.address,
    parent: os.rootLeader?.address,
  });
  await calculator.start();
  await os.addNode(calculator);

  // Create HTTP server
  const server = oServer({
    os,
    port: 3000,
    basePath: '/api/v1',
    cors: {
      origin: '*',
    },
    debug: true,
  });

  // Start the server
  await server.start();

  console.log('\n✅ Server running!');
  console.log('\nTry these commands:');
  console.log('\n1. Discover nodes:');
  console.log('   curl http://localhost:3000/api/v1/nodes');
  console.log('\n2. Call add tool:');
  console.log('   curl -X POST http://localhost:3000/api/v1/calculator/add \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"a": 5, "b": 3}\'');
  console.log('\n3. Call subtract tool:');
  console.log(
    '   curl -X POST http://localhost:3000/api/v1/calculator/subtract \\',
  );
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"a": 10, "b": 4}\'');
  console.log('\nPress Ctrl+C to stop\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    await os.stop();
    process.exit(0);
  });
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
