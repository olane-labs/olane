import {
  oAddress,
  oResponse,
  RegexUtils,
  RestrictedAddresses,
} from '@olane/o-core';
import { oCapabilityIntelligenceResult } from './interfaces/o-capability.intelligence-result.js';
import { oCapability } from './o-capability.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';

export abstract class oCapabilityIntelligence extends oCapability {
  async intelligence(prompt: string): Promise<oCapabilityIntelligenceResult> {
    try {
      if (!this.node.isRunning) {
        throw new Error(
          'Node is not running, cannot use intelligence capability',
        );
      }
      let message = '';
      await this.node.useStream(
        new oAddress(RestrictedAddresses.INTELLIGENCE),
        {
          method: 'prompt',
          params: {
            prompt: prompt,
            _isStream: this.config.onChunk ? true : false,
          },
        },
        {
          onChunk: (chunk: oResponse) => {
            this.logger.debug('Chunk received: ', chunk);
            message += (chunk.result.data as any).delta;
            this.config.onChunk?.(chunk.result.data);
          },
        },
      );

      if (!message) {
        throw new Error('No message returned from intelligence');
      }
      const processedResult = RegexUtils.extractResultFromAI(message);
      this.logger.debug('Processed result: ', processedResult);
      return new oCapabilityIntelligenceResult({
        result: processedResult,
        type: processedResult.type,
        config: this.config,
        error: undefined,
      });
    } catch (error: any) {
      return new oCapabilityIntelligenceResult({
        result: null,
        type: oCapabilityType.EVALUATE,
        config: this.config,
        error: error?.message || error || 'Unknown error',
      });
    }
  }
}
