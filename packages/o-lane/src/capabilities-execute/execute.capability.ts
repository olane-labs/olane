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
      context_global: '',
      chat_history: '',
      past_cycles: '',
    })
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
        'Configure capability is being replayed - re-executing to restore state',
      );
    }

    const handshake = await this.handshake();
    if (!handshake.result) {
      throw new oError(oErrorCodes.INVALID_RESPONSE, 'Handshake failed');
    }
    // this.logger.debug('Handshake: ', handshake.result);
    const { tools, methods } = handshake.result;
    const prompt = await this.loadPrompt({ tools, methods });
    const response = await this.intelligence(prompt);

    return response;
  }
}
