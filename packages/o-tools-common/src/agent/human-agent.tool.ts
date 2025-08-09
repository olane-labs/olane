import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { HUMAN_PARAMS } from './methods/human.methods';
import { BaseAgentTool, Agent, AgentMessage } from './base-agent.tool';

// Legacy interfaces for backward compatibility
export interface HumanMessage extends AgentMessage {}

export interface Human extends Omit<Agent, 'type'> {}

export class HumanTool extends BaseAgentTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://human'),
      methods: HUMAN_PARAMS,
      description: 'A tool to interface between network and human',
    });
  }

  // Implement abstract methods from BaseAgentTool
  async sendMessage(request: oRequest): Promise<ToolResult> {
    return this.handleSendMessage('human', request);
  }

  async _tool_send_message(request: oRequest): Promise<ToolResult> {
    return this.sendMessage(request);
  }

  async broadcastMessage(request: oRequest): Promise<ToolResult> {
    return this.handleBroadcastMessage('human', request, 'human');
  }

  async _tool_broadcast_message(request: oRequest): Promise<ToolResult> {
    return this.broadcastMessage(request);
  }

  async getAgentsList(request: oRequest): Promise<ToolResult> {
    return this.handleGetAgentsList(request, 'human');
  }

  async _tool_get_humans(request: oRequest): Promise<ToolResult> {
    return this.getAgentsList(request);
  }

  // Additional utility methods for managing humans (backward compatibility)
  addHuman(human: Omit<Human, 'lastSeen'>): void {
    this.addAgent({
      ...human,
      type: 'human',
    });
  }

  removeHuman(humanId: string): void {
    this.removeAgent(humanId);
  }

  updateHumanStatus(humanId: string, status: Human['status']): void {
    this.updateAgentStatus(humanId, status);
  }

  getHumans(status?: Human['status']): Human[] {
    return this.getAllAgents('human', status).map((agent) => ({
      id: agent.id,
      name: agent.name,
      address: agent.address,
      status: agent.status,
      lastSeen: agent.lastSeen,
    }));
  }
}
