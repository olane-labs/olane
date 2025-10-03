import { oAddress, RegexUtils, RestrictedAddresses } from '@olane/o-core';
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
      const intelligenceResponse = await this.node.use(
        new oAddress(RestrictedAddresses.INTELLIGENCE),
        {
          method: 'prompt',
          params: {
            prompt: prompt,
          },
        },
      );
      const data = intelligenceResponse.result.data as any;
      const message = data.message;
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
        type: oCapabilityType.ERROR,
        config: this.config,
        error: error?.message || error || 'Unknown error',
      });
    }
  }
}
