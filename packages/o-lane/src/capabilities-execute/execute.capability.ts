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

  async loadPrompt({ tools, methods }: any): Promise<string> {
    const prompt = await this.promptLoader?.loadPromptForType(this.type, {
      human_about: '',
      agent_about: '',
      context_global: `
        Tools are hosted in a graph address space.
        You are in a secure environment and are allowed to operate with secure information (api keys, credit card info, etc).`,
      chat_history: '',
      past_cycles: '',
      address: this.config.params.address,
      methods: methods ? JSON.stringify(methods) : '',
    });
    return prompt.render();
  }

  async handshake(): Promise<oHandshakeResult> {
    const response = await this.node.use(
      new oAddress(this.config.params.address),
      {
        method: oProtocolMethods.HANDSHAKE,
        params: {
          intent: this.config.intent.value,
        },
      },
    );
    return response.result.data as oHandshakeResult;
  }

  async run(): Promise<oCapabilityResult> {
    // Check if we're in replay mode
    if (this.config.isReplay) {
      this.logger.debug(
        'Execute capability is being replayed - re-executing to restore state',
      );
    }

    const handshake = await this.handshake();
    if (!handshake.result) {
      throw new oError(oErrorCodes.INVALID_RESPONSE, 'Handshake failed');
    }

    const { tools, methods } = handshake.result;
    const prompt = await this.loadPrompt({ tools, methods });
    const aiResponse = await this.intelligence(prompt);

    // Extract task details from AI response
    // The AI should return the method and params to execute
    const task = (aiResponse.result as any)?.task || (aiResponse.result as any);
    if (!task || !task.method) {
      this.logger.warn('AI did not return a valid task to execute', {
        aiResponse,
      });
      return aiResponse; // Return AI response as-is if no task to execute
    }

    const method = task.method;
    const params = task.params || {};

    this.logger.debug('AI decided to execute:', { method, params });

    // Request approval before executing the task
    try {
      const approvalResponse = await this.node.use(
        new oAddress('o://approval'),
        {
          method: 'request_approval',
          params: {
            toolAddress: this.config.params.address,
            method: method,
            params: params,
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

    try {
      // Execute the task
      const taskResponse = await this.node.use(
        new oAddress(this.config.params.address),
        {
          method: method,
          params: params,
        },
      );

      // Check if the tool response contains _save flag
      const shouldPersist = (taskResponse.result?.data as any)?._save === true;
      if (shouldPersist) {
        this.logger.debug(
          'Tool response contains _save flag - lane will be persisted to config',
        );
      }

      // Return an EVALUATE result that contains the task execution output
      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE,
        config: this.config,
        result: {
          taskConfig: {
            method: method,
            params: params,
          },
          response: taskResponse.result,
        },
        shouldPersist,
      });
    } catch (error: any) {
      this.logger.error(
        'Failed to execute:',
        `Error when trying to use ${this.config?.params?.address} with config: ${JSON.stringify(
          {
            method: method,
            params: params,
          },
        )} resulting in error: ${error?.message}`,
      );
      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE,
        config: this.config,
        error: `Error when trying to use ${this.config?.params?.address} with config: ${JSON.stringify(
          {
            method: method,
            params: params,
          },
        )} resulting in error: ${error?.message}`,
      });
    }
  }
}
