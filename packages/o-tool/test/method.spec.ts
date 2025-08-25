import { oAddress, NodeState, oRequest } from '@olane/o-core';
import { oVirtualTool } from '../src/virtual.tool.js';
import { expect } from 'chai';

describe('o-tool @methods', () => {
  it('should call the hello_world method', async () => {
    const node = new oVirtualTool({
      address: new oAddress('o://test'),
      leader: null,
      parent: null,
    });

    await node.start();
    expect(node.state).to.equal(NodeState.RUNNING);

    // call the tool
    const req = new oRequest({
      method: 'hello_world',
      id: '123',
      params: {
        _connectionId: '123',
        _requestMethod: 'hello_world',
      },
    });
    const data = await node.callMyTool(req);
    expect(data.message).to.equal('Hello, world!');

    // stop the node
    await node.stop();
    expect(node.state).to.equal(NodeState.STOPPED);
  });
});
