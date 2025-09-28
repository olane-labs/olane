import { oAddress, RegexUtils, RestrictedAddresses } from '@olane/o-core';
import { oCapabilityIntelligenceResult } from './interfaces/o-capability.intelligence-result.js';
import { oCapabilityResult } from './interfaces/o-capability.result.js';
import { oCapability } from './o-capability.js';

export abstract class oCapabilityIntelligence extends oCapability {
  async intelligence(prompt: string): Promise<oCapabilityIntelligenceResult> {
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
    return {
      result: processedResult,
    };
  }
}
