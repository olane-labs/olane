import { oTool, oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest, oVirtualNode } from '@olane/o-core';
import { oMethod } from '@olane/o-protocol';
import { v4 as uuidv4 } from 'uuid';

export interface AgentMessage {
  id: string;
  sender: string;
  recipient: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messageType: 'notification' | 'request' | 'alert' | 'info' | 'announcement';
  requiresResponse?: boolean;
  timestamp: Date;
  delivered: boolean;
  response?: string;
  responseTimestamp?: Date;
}

export interface Agent {
  id: string;
  name?: string;
  address: string;
  type: 'human' | 'ai';
  status: 'online' | 'offline' | 'available' | 'busy';
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export abstract class BaseAgentTool extends oTool(oVirtualNode) {
  protected messageQueue: Map<string, AgentMessage> = new Map();
  protected agents: Map<string, Agent> = new Map();
  protected messageId = 0;

  constructor(
    config: oToolConfig & {
      address: oAddress;
      methods: { [key: string]: oMethod };
      description: string;
    },
  ) {
    super(config);
  }

  protected generateMessageId(): string {
    return uuidv4();
  }

  protected validateRecipient(recipient: string): Agent | null {
    return (
      this.agents.get(recipient) ||
      Array.from(this.agents.values()).find(
        (a) => a.name === recipient || a.address === recipient,
      ) ||
      null
    );
  }

  protected createMessage(
    sender: string,
    recipient: string,
    message: string,
    options: {
      priority?: AgentMessage['priority'];
      messageType?: AgentMessage['messageType'];
      requiresResponse?: boolean;
    } = {},
  ): AgentMessage {
    const messageId = this.generateMessageId();
    return {
      id: messageId,
      sender,
      recipient,
      message,
      priority: options.priority || 'normal',
      messageType: options.messageType || 'info',
      requiresResponse: options.requiresResponse || false,
      timestamp: new Date(),
      delivered: false,
    };
  }

  protected simulateDelivery(messageId: string, delay = 100): void {
    setTimeout(() => {
      const msg = this.messageQueue.get(messageId);
      if (msg) {
        msg.delivered = true;
        this.messageQueue.set(messageId, msg);
      }
    }, delay);
  }

  // Core agent management methods
  addAgent(agent: Omit<Agent, 'lastSeen'>): void {
    this.agents.set(agent.id, {
      ...agent,
      lastSeen: new Date(),
    });
  }

  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  updateAgentStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = new Date();
      this.agents.set(agentId, agent);
    }
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(
    filterByType?: Agent['type'],
    filterByStatus?: Agent['status'],
  ): Agent[] {
    let agents = Array.from(this.agents.values());

    if (filterByType) {
      agents = agents.filter((a) => a.type === filterByType);
    }

    if (filterByStatus) {
      agents = agents.filter((a) => a.status === filterByStatus);
    }

    return agents;
  }

  // Message management methods
  getMessageHistory(limit = 100): AgentMessage[] {
    return Array.from(this.messageQueue.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  markMessageAsRead(messageId: string, response?: string): void {
    const message = this.messageQueue.get(messageId);
    if (message) {
      message.response = response;
      message.responseTimestamp = new Date();
      this.messageQueue.set(messageId, message);
    }
  }

  getMessage(messageId: string): AgentMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  // Abstract methods that concrete agents must implement
  abstract sendMessage(request: oRequest): Promise<ToolResult>;
  abstract broadcastMessage(request: oRequest): Promise<ToolResult>;
  abstract getAgentsList(request: oRequest): Promise<ToolResult>;

  // Common utility methods for sending messages
  protected async handleSendMessage(
    senderType: Agent['type'],
    request: oRequest,
  ): Promise<ToolResult> {
    const params = request.params as any;
    const {
      recipient,
      message,
      priority = 'normal',
      messageType = 'info',
      requiresResponse = false,
    } = params;

    // Validate recipient exists
    const recipientAgent = this.validateRecipient(recipient);
    if (!recipientAgent) {
      return {
        error: `Agent recipient '${recipient}' not found in the network`,
        availableAgents: this.getAllAgents().map((a) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          status: a.status,
          type: a.type,
        })),
      };
    }

    // Create message
    const agentMessage = this.createMessage(
      request.params._connectionId || 'unknown',
      recipientAgent.id,
      message,
      { priority, messageType, requiresResponse },
    );

    // Store message in queue
    this.messageQueue.set(agentMessage.id, agentMessage);

    // Simulate message delivery
    this.simulateDelivery(agentMessage.id);

    return {
      messageId: agentMessage.id,
      recipient: {
        id: recipientAgent.id,
        name: recipientAgent.name,
        address: recipientAgent.address,
        type: recipientAgent.type,
      },
      message: `Message sent to ${recipientAgent.name || recipientAgent.id}`,
      timestamp: agentMessage.timestamp.toISOString(),
      requiresResponse,
    };
  }

  protected async handleBroadcastMessage(
    senderType: Agent['type'],
    request: oRequest,
    targetType?: Agent['type'],
  ): Promise<ToolResult> {
    const params = request.params as any;
    const {
      message,
      priority = 'normal',
      messageType = 'announcement',
    } = params;

    const availableAgents = this.getAllAgents(targetType, 'available').concat(
      this.getAllAgents(targetType, 'online'),
    );

    if (availableAgents.length === 0) {
      return {
        error: `No available ${targetType || 'agents'} found in the network`,
        totalAgents: this.agents.size,
      };
    }

    const messageId = this.generateMessageId();
    const broadcasts: any[] = [];

    // Send to each available agent
    for (const agent of availableAgents) {
      const agentMessage = this.createMessage(
        request.params._connectionId || 'unknown',
        agent.id,
        message,
        { priority, messageType },
      );
      agentMessage.id = `${messageId}-${agent.id}`;

      this.messageQueue.set(agentMessage.id, agentMessage);
      broadcasts.push({
        messageId: agentMessage.id,
        recipient: {
          id: agent.id,
          name: agent.name,
          address: agent.address,
          type: agent.type,
        },
      });

      // Simulate delivery
      this.simulateDelivery(agentMessage.id);
    }

    return {
      broadcastId: messageId,
      message: `Broadcast sent to ${broadcasts.length} ${targetType || 'agents'}`,
      recipients: broadcasts,
      timestamp: new Date().toISOString(),
    };
  }

  protected async handleGetAgentsList(
    request: oRequest,
    agentType?: Agent['type'],
  ): Promise<ToolResult> {
    const params = request.params as any;
    const { status } = params;

    let agents = this.getAllAgents(agentType, status);

    return {
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        address: a.address,
        type: a.type,
        status: a.status,
        lastSeen: a.lastSeen.toISOString(),
      })),
      total: agents.length,
      filtered: !!status,
      type: agentType || 'all',
    };
  }
}
