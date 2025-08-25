import { NodeState, oAddress, oVirtualNode } from '../../src/index.js';
import { expect } from 'chai';

describe('in-process @memory', () => {
  it('should be able to start a single node with no leader', async () => {
    const node = new oVirtualNode({
      address: new oAddress('o://test'),
      leader: null,
      parent: null,
    });

    await node.start();
    expect(node.state).to.equal(NodeState.RUNNING);
    const transports = node.transports;
    expect(transports.length).to.equal(1);
    expect(transports[0].toString()).to.contain('/memory');
    await node.stop();
    expect(node.state).to.equal(NodeState.STOPPED);
  });
});
