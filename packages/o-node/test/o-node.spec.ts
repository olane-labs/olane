import { NodeState } from '@olane/o-core';
import { expect } from 'chai';
import { oNode } from '../src/index.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('in-process @memory', () => {
  it('should be able to start a single node with no leader', async () => {
    const node = new oNode({
      address: new oNodeAddress('o://test'),
      leader: null,
      parent: null,
    });

    await node.start();
    expect(node.state).to.equal(NodeState.RUNNING);
    const transports = node.transports;
    // expect(transports.length).to.equal(1);
    // expect(transports[0].toString()).to.contain('/memory');
    await node.stop();
    expect(node.state).to.equal(NodeState.STOPPED);
  });
});
