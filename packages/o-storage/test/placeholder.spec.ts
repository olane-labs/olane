import { NodeState, oAddress } from '@olane/o-core';
import { expect } from 'chai';
import { oLeaderNode, RegistryMemoryTool } from '@olane/o-leader';
import { IntelligenceTool } from '@olane/o-intelligence';
import { StorageTool } from '../src/index.js';
import { bigfile } from './data/bigfile.js';
import { oVirtualTool } from '@olane/o-tool';
import dotenv from 'dotenv';

dotenv.config();

const leader = new oLeaderNode({
  parent: null,
  leader: null,
});
const node = new oVirtualTool({
  parent: null,
  leader: null,
  address: new oAddress('o://node'),
});
leader.addChildNode(node);

describe('o-storage @placeholder', () => {
  it('should be able to start a node', async () => {
    const registryTool = new RegistryMemoryTool({
      parent: leader.address,
      leader: leader.address,
    });
    leader.addChildNode(registryTool);
    const intelligenceTool = new IntelligenceTool({
      parent: node.address,
      leader: node.address,
    });
    leader.addChildNode(intelligenceTool);
    const storageTool = new StorageTool({
      parent: node.address,
      leader: node.address,
    });
    leader.addChildNode(storageTool);
    await leader.start();
    expect(intelligenceTool.state).to.equal(NodeState.RUNNING);
  });
  it('should be able to perform a put', async () => {
    const result = await leader.use(
      new oAddress('o://leader/storage/placeholder'),
      {
        method: 'put',
        params: {
          key: 'test-key-1234',
          value: bigfile,
          intent: 'I want to copy file "bigfile.txt" to "bigfile.txt.copy"',
        },
      },
    );
    console.log(result.result.data);
  });

  it('should be able to perform a get', async () => {
    const result = await leader.use(
      new oAddress('o://leader/storage/placeholder/test-key-1234'),
    );
    const data = result.result.data as any;
    expect(data.value.length > 0).to.be.true;
  });

  it('should be able to perform an explicit get', async () => {
    const result = await leader.use(
      new oAddress('o://leader/storage/placeholder/test-key-1234/get'),
    );
    const data = result.result.data as any;
    expect(data.value.length > 0).to.be.true;
  });
});
