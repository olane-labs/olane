import { oAddress, oError, oErrorCodes } from '@olane/o-core';
import { oCapabilityResult, oCapabilityType } from '../capabilities/index.js';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oProtocolMethods } from '@olane/o-protocol';
import { oHandshakeResult } from '../interfaces/handshake.result.js';
import { oCapabilityExecuteConfig } from './interfaces/o-capability.configure-config.js';

export class oCapabilityExecute extends oCapabilityIntelligence {
  public config!: oCapabilityExecuteConfig;

  get type(): oCapabilityType {
    return oCapabilityType.EXECUTE;
  }

  static get type() {
    return oCapabilityType.EXECUTE;
  }

  private resolveAddress(): string {
    const address =
      this.config.params?.address || this.config.params?.task?.address;
    if (!address || typeof address !== 'string') {
      throw new Error(
        `Execute capability requires a valid address but received: ${JSON.stringify(address)}. ` +
          `The AI response must include an "address" field when type is "execute".`,
      );
    }
    return address;
  }

  async loadPrompt({ tools, methods }: any): Promise<string> {
    const prompt = await this.promptLoader?.loadPromptForType(this.type, {
      human_about: '',
      agent_about: '',
      context_global: `
        Tools are hosted in a graph address space.
        You are in a secure environment and are allowed to operate with secure information (api keys, credit card info, etc).`,
      chat_history: '',
      past_cycles: '',
      address: this.resolveAddress(),
      methods: methods ? JSON.stringify(methods) : '',
    });
    return prompt.render();
  }

  async handshake(): Promise<oHandshakeResult> {
    const response = await this.node.use(new oAddress(this.resolveAddress()), {
      method: oProtocolMethods.HANDSHAKE,
      params: {
        intent: this.config.intent.value,
      },
    });
    return response.result.data as oHandshakeResult;
  }

  private async executeTask(method: string, params: any): Promise<any> {
    this.logger.debug('Executing task:', method);
    return await this.node.use(new oAddress(this.resolveAddress()), {
      method,
      params,
    });
  }

  private buildResult(
    taskResponse: any,
    handshakeResult: any,
    taskConfig: { method: string; params: any },
    address?: string,
  ): oCapabilityResult {
    const shouldPersist = (taskResponse.result?.data as any)?._save === true;
    if (shouldPersist) {
      this.logger.debug(
        'Tool response contains _save flag - lane will be persisted to config',
      );
    }

    const result: any = {
      handshakeResult,
      taskConfig,
      response: taskResponse.result,
    };
    if (address) {
      result.address = address;
    }

    return new oCapabilityResult({
      type: oCapabilityType.EVALUATE,
      config: this.config,
      result,
      shouldPersist,
    });
  }

  private buildErrorResult(
    error: any,
    handshakeResult: any,
    taskConfig: { method: string; params: any },
  ): oCapabilityResult {
    const addr = this.resolveAddress();
    const errorMessage = `Error when trying to use ${addr} with config: ${JSON.stringify(taskConfig)} resulting in error: ${error?.message}`;

    this.logger.error('Failed to execute:', errorMessage);

    return new oCapabilityResult({
      type: oCapabilityType.EVALUATE,
      config: this.config,
      result: {
        handshakeResult,
        taskConfig,
      },
      error: errorMessage,
    });
  }

  private async requestApproval(method: string, params: any): Promise<void> {
    try {
      const approvalResponse = await this.node.use(
        new oAddress('o://approval'),
        {
          method: 'request_approval',
          params: {
            toolAddress: this.resolveAddress(),
            method,
            params,
            intent: this.config.intent,
          },
        },
      );

      const approved = (approvalResponse.result.data as any)?.approved;
      if (!approved) {
        const decision =
          (approvalResponse.result.data as any)?.decision || 'denied';
        this.logger.warn(
          `Task execution denied by approval system: ${decision}`,
        );
        throw new oError(
          oErrorCodes.NOT_AUTHORIZED,
          `Action denied by approval system: ${decision}`,
        );
      }

      this.logger.debug('Task approved, proceeding with execution');
    } catch (error: any) {
      // If approval service is not available, log warning and continue
      // This ensures backward compatibility
      if (error.message?.includes('No route found')) {
        this.logger.warn(
          'Approval service not available, proceeding without approval check',
        );
      } else {
        throw error;
      }
    }
  }

  async run(): Promise<oCapabilityResult> {
    this.logger.debug(
      'Starting execution capability with config:',
      this.config.intent,
    );

    // Replay mode: skip handshake, AI, and approval
    if (this.config.isReplay) {
      this.logger.debug(
        'Execute capability is being replayed - using stored execution data',
      );

      const storedExecution = this.config.params;

      if (!storedExecution) {
        this.logger.warn('Invalid replay:', this.config);
        throw new oError(
          oErrorCodes.INVALID_RESPONSE,
          'Replay mode enabled but no stored execution data found',
        );
      }

      if (!storedExecution.handshakeResult || !storedExecution.taskConfig) {
        throw new oError(
          oErrorCodes.INVALID_RESPONSE,
          'Replay mode enabled but stored execution data is incomplete',
        );
      }

      const { handshakeResult, taskConfig } = storedExecution;
      const { method, params } = taskConfig;

      this.logger.debug('Replaying task execution with stored data', {
        method,
        params,
        skipHandshake: true,
        skipIntelligence: true,
        skipApproval: true,
      });

      try {
        const taskResponse = await this.executeTask(method, params);
        return this.buildResult(taskResponse, handshakeResult, taskConfig);
      } catch (error: any) {
        return this.buildErrorResult(error, handshakeResult, taskConfig);
      }
    }

    // Normal execution flow
    const handshake = await this.handshake();
    if (!handshake.result) {
      throw new oError(oErrorCodes.INVALID_RESPONSE, 'Handshake failed');
    }

    const { tools, methods } = handshake.result;
    const prompt = await this.loadPrompt({ tools, methods });
    const aiResponse = await this.intelligence(prompt);

    const task = (aiResponse.result as any)?.task || (aiResponse.result as any);
    if (!task || !task.method) {
      this.logger.warn('AI did not return a valid task to execute', {
        aiResponse,
      });
      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE,
        config: this.config,
        result: {
          handshakeResult: { tools, methods },
          address: this.resolveAddress(),
          response: aiResponse.result,
        },
        shouldPersist: false,
      });
    }

    const method = task.method;
    const params = task.params || {};
    const taskConfig = { method, params };

    this.logger.debug('AI decided to execute:', { method, params });

    await this.requestApproval(method, params);

    try {
      const taskResponse = await this.executeTask(method, params);
      return this.buildResult(
        taskResponse,
        { tools, methods },
        taskConfig,
        this.resolveAddress(),
      );
    } catch (error: any) {
      return this.buildErrorResult(error, { tools, methods }, taskConfig);
    }
  }
}
