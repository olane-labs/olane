import { expect } from 'chai';
import { McpBridgeTool } from '../src/index.js';
import { NodeState, oAddress } from '@olane/o-core';

const mcpTool = new McpBridgeTool({
  parent: null,
  leader: null,
  address: new oAddress('o://mcp'),
});

describe('o-mcp verify myTools works', () => {
  it('should be able to stop a node', async () => {
    const tools = await mcpTool.myTools();
    console.log(tools);
    expect(tools.length).to.be.greaterThan(0);
  });
});
