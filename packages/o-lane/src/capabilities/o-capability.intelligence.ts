import {
  oAddress,
  oResponse,
  RegexUtils,
  RestrictedAddresses,
} from '@olane/o-core';
import { oCapabilityIntelligenceResult } from './interfaces/o-capability.intelligence-result.js';
import { oCapability } from './o-capability.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { ResultStreamParser } from './utils/result-stream-parser.js';

export abstract class oCapabilityIntelligence extends oCapability {
  async intelligence(prompt: string): Promise<oCapabilityIntelligenceResult> {
    try {
      if (!this.node.isRunning) {
        throw new Error(
          'Node is not running, cannot use intelligence capability',
        );
      }
      let message = '';
      const parser = new ResultStreamParser();

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
            const delta = (chunk.result.data as any).delta;
            message += delta;

            // Extract only new content from "result" field
            const resultDelta = parser.processChunk(delta);

            if (resultDelta && this.config.onChunk) {
              // Emit only the result field content
              const chunkData = chunk.result.data as any;
              this.config.onChunk({
                ...chunkData,
                delta: resultDelta,
              });
            }
          },
        },
      );

      if (!message) {
        throw new Error('No message returned from intelligence');
      }

      // Use the parsed result value if available, otherwise fall back to full message
      const resultValue = parser.getResultValue();
      const processedResult = RegexUtils.extractResultFromAI(
        resultValue || message,
      );
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
