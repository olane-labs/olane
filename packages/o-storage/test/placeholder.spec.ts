import { NodeState, oAddress } from '@olane/o-core';
import { expect } from 'chai';
import { oLeaderNode, RegistryMemoryTool } from '@olane/o-leader';
import { IntelligenceTool } from '@olane/o-intelligence';
import { StorageTool } from '../src/index.js';
import { bigfile } from './data/bigfile.js';
import * as dotenv from 'dotenv';
import { oNodeTool } from '@olane/o-node';

dotenv.config();

const leader = new oLeaderNode({
  parent: null,
  leader: null,
});

describe('o-storage @placeholder', () => {
  it('should be able to start a node', async () => {
    await leader.start();
    const node = new oNodeTool({
      parent: leader.address,
      leader: leader.address,
      address: new oAddress('o://node'),
    });
    await node.start();
    leader.addChildNode(node);
    const intelligenceTool = new IntelligenceTool({
      parent: node.address,
      leader: leader.address,
    });
    await intelligenceTool.start();
    node.addChildNode(intelligenceTool);
    const storageTool = new StorageTool({
      parent: node.address,
      leader: leader.address,
    });
    await storageTool.start();
    node.addChildNode(storageTool);
    expect(intelligenceTool.state).to.equal(NodeState.RUNNING);
  });
  it('should be able to perform a put', async () => {
    console.log('[TEST START] Performing put!');
    const result = await leader.use(new oAddress('o://placeholder'), {
      method: 'put',
      params: {
        key: 'test-key-1234',
        value: bigfile,
        intent: 'I want to copy file "bigfile.txt" to "bigfile.txt.copy"',
      },
    });
    console.log('[TEST END] Performed put!');
  });

  it('should be able to perform a get', async () => {
    const result = await leader.use(
      new oAddress('o://placeholder/test-key-1234'),
    );
    const data = result.result.data as any;
    expect(data.value.length > 0).to.be.true;
  });

  it('should be able to perform an explicit get', async () => {
    const result = await leader.use(
      new oAddress('o://placeholder/test-key-1234/get'),
    );
    const data = result.result.data as any;
    expect(data.value.length > 0).to.be.true;
  });
});
