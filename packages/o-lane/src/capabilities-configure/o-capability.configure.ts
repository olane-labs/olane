import { oAddress, oError, oErrorCodes } from '@olane/o-core';
import { oCapabilityResult, oCapabilityType } from '../capabilities/index.js';
import { oCapabilityConfigureConfig } from './interfaces/o-capability.configure-config.js';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oLaneContext } from '../o-lane.context.js';
import { oMethod, oProtocolMethods, oResponse } from '@olane/o-protocol';
import { AGENT_PROMPT } from '../prompts/agent.prompt.js';
import { CONFIGURE_INSTRUCTIONS } from '../prompts/configure.prompt.js';
import { oHandshakeResult } from '../interfaces/handshake.result.js';

export class oCapabilityConfigure extends oCapabilityIntelligence {
  public config!: oCapabilityConfigureConfig;

  get type(): oCapabilityType {
    return oCapabilityType.CONFIGURE;
  }

  static get type() {
    return oCapabilityType.CONFIGURE;
  }

  generatePrompt(tools: string[], methods: { [key: string]: oMethod }): string {
    const context = new oLaneContext([
      `[Method Metadata Begin]\n${JSON.stringify(methods, null, 2)}\n[Method Metadata End]`,
      `[Method Options Begin]\n${(tools || []).join(', ')}\n[Method Options End]`,
    ]);
    const configureIntent = `Configure the tool use, prioritize "Use Tool Instructions". You have already found the tool to resolve the user's intent: ${this.config.params.toolAddress}. Configure the request to use the tool with user intent: ${this.config.params.intent}`;

    return AGENT_PROMPT(
      configureIntent,
      context.toString(),
      this.config.history || '',
      CONFIGURE_INSTRUCTIONS,
    );
  }

  async handshake(): Promise<oHandshakeResult> {
    const response = await this.node.use(
      new oAddress(this.config.params.toolAddress),
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
    const prompt = this.generatePrompt(tools, methods);
    const response = await this.intelligence(prompt);

    return response;
  }
}
