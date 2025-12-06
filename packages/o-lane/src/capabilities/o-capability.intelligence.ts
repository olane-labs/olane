import {
  oAddress,
  oResponse,
  RegexUtils,
  RestrictedAddresses,
} from '@olane/o-core';
import { oCapabilityIntelligenceResult } from './interfaces/o-capability.intelligence-result.js';
import { oCapability } from './o-capability.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityConfig } from './o-capability.config.js';

export abstract class oCapabilityIntelligence extends oCapability {

  async intelligence(prompt: string): Promise<oCapabilityIntelligenceResult> {
    try {
      const _isStreaming = this.config?.useStream || false;

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
            // if (chunk.result.data.delta) {
            //   const parseResult = parser.processChunk(chunk.result.data.delta);
            //   if (parseResult) {
            //     this.config.onChunk?.(oResponse.fromJSON(parseResult));
            //   }
            // }
          },
        },
      );

      const message = response.result.data.message;
      if (!message) {
        throw new Error('No message returned from intelligence');
      }

      // Use the parsed result value if available, otherwise fall back to full message
      const processedResult = RegexUtils.extractResultFromAI(message);

      // Extract structured fields from AI response
      // The AI returns JSON with fields like: type, summary, reasoning, result, etc.
      const { type } = processedResult;

      return new oCapabilityIntelligenceResult({
        result: processedResult, // Keep full result for backwards compatibility
        type: type || oCapabilityType.EVALUATE,
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
