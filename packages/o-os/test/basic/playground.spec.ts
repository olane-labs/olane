import { oAddress, NodeState } from '@olane/o-core';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { defaultOSInstance } from '../utils/os.default.js';
import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';
import { oNodeAddress, oNodeTransport } from '@olane/o-node';
import { tmpNode } from '../utils/tmp.node.js';

dotenv.config();

const network = defaultOSInstance;

describe('playground running', async () => {
  it('should be able to use stream from a provider service', async () => {
    const entryNode = tmpNode;
    await entryNode.start();
    expect(entryNode).to.exist;
    expect(entryNode.state).to.equal(NodeState.RUNNING);

    console.log('Using intelligence tool');
    const response = await entryNode.useStream(
      new oNodeAddress('o://leader/auth/services/intelligence', [
        new oNodeTransport(
          '/ip4/127.0.0.1/tcp/4000/ws/p2p/12D3KooWPHdsHhEdyBd9DS2zHJ1vRSyqSkZ97iT7F8ByYJ7U7bw8',
        ),
      ]),
      {
        method: 'prompt',
        params: {
          _isStream: true,
          prompt: 'What is the capital of France?',
          _token: 'test',
        },
      },
      {
        onChunk: (chunk) => {
          console.log(
            'Received chunk:',
            JSON.stringify(chunk.result.data, null, 2),
          );
        },
      },
    );
    console.log('Response:', response.result.data);
    await entryNode.stop();
  });
});
