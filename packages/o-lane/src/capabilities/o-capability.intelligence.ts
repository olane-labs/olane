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
      const _isStreaming = this.config.useStream || false;

      const response = await this.node.useStream(
        new oAddress(RestrictedAddresses.INTELLIGENCE),
        {
          method: 'prompt',
          params: {
            prompt: prompt,
            _isStreaming: _isStreaming,
          },
        },
        {
          onChunk: (chunk: oResponse) => {
            if (this.config.onChunk) {
              // Emit only the result field content
              this.config.onChunk(oResponse.fromJSON(chunk));
            }
          },
        },
      );

      const message = response.result.data.message;
      if (!message) {
        throw new Error('No message returned from intelligence');
      }

      // Use the parsed result value if available, otherwise fall back to full message
      const processedResult = RegexUtils.extractResultFromAI(message);
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
