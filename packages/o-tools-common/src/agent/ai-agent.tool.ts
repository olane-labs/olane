import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { BaseAgentTool, Agent } from './base-agent.tool';
import { AI_AGENT_PARAMS } from './methods/ai-agent.methods';

export interface AIAgent extends Omit<Agent, 'type'> {
  model?: string;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
}
export class AIAgentTool extends BaseAgentTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://ai'),
      methods: AI_AGENT_PARAMS,
      description:
        'AI agent for automated task processing and inter-agent communication',
    });
  }

  // Implement abstract methods from BaseAgentTool
  async sendMessage(request: oRequest): Promise<ToolResult> {
    return this.handleSendMessage('ai', request);
  }

  async _tool_send_message(request: oRequest): Promise<ToolResult> {
    return this.sendMessage(request);
  }

  async broadcastMessage(request: oRequest): Promise<ToolResult> {
    const params = request.params as any;
    const targetType = params.targetType as Agent['type'] | undefined;
    return this.handleBroadcastMessage('ai', request, targetType);
  }

  async _tool_broadcast_message(request: oRequest): Promise<ToolResult> {
    return this.broadcastMessage(request);
  }

  async getAgentsList(request: oRequest): Promise<ToolResult> {
    const params = request.params as any;
    const agentType = params.type as Agent['type'] | undefined;
    return this.handleGetAgentsList(request, agentType);
  }

  async _tool_get_agents(request: oRequest): Promise<ToolResult> {
    return this.getAgentsList(request);
  }

  async _tool_process_task(request: oRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { task, context, model } = params;

    // This is a placeholder for AI task processing
    // In a real implementation, this would integrate with AI services
    const result = await this.processAITask(task, context, model);

    return {
      taskId: this.generateMessageId(),
      task,
      result,
      model: model || 'default',
      timestamp: new Date().toISOString(),
      processed: true,
    };
  }

  // AI-specific utility methods
  addAIAgent(agent: Omit<AIAgent, 'lastSeen'>): void {
    this.addAgent({
      ...agent,
      type: 'ai',
    });
  }

  getAIAgents(status?: Agent['status']): AIAgent[] {
    return this.getAllAgents('ai', status).map((agent) => ({
      id: agent.id,
      name: agent.name,
      address: agent.address,
      status: agent.status,
      lastSeen: agent.lastSeen,
      metadata: agent.metadata,
      model: agent.metadata?.model,
      provider: agent.metadata?.provider,
      maxTokens: agent.metadata?.maxTokens,
      temperature: agent.metadata?.temperature,
    }));
  }

  private async processAITask(
    task: string,
    context?: string,
    model?: string,
  ): Promise<string> {
    // Placeholder for AI task processing
    // In a real implementation, this would call AI services like OpenAI, Claude, etc.
    const fullPrompt = context ? `Context: ${context}\n\nTask: ${task}` : task;

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return `AI processed task: "${task}" using model: ${model || 'default'}. Context provided: ${!!context}`;
  }

  updateAIAgentModel(agentId: string, model: string, provider?: string): void {
    const agent = this.getAgent(agentId);
    if (agent && agent.type === 'ai') {
      agent.metadata = {
        ...agent.metadata,
        model,
        provider,
      };
      this.agents.set(agentId, agent);
    }
  }
}
