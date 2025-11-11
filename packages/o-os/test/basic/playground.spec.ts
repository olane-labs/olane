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
      new oNodeAddress('o://leader', [
        new oNodeTransport(
          '/ip4/127.0.0.1/tcp/4000/ws/p2p/12D3KooWPHdsHhEdyBd9DS2zHJ1vRSyqSkZ97iT7F8ByYJ7U7bw8',
        ),
      ]),
      {
        method: 'intent',
        params: {
          _isStreaming: true,
          intent:
            'Use the perplexity tool to search for the latest news on the stock market',
          _token: 'test',
        },
      },
      {
        abortSignal: AbortSignal.timeout(5_000),
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
