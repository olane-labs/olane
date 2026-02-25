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
      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('Intelligence prompt sending', {
          promptLength: prompt.length,
          preview: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
          intent: this.config?.intent?.value,
          isStreaming: this.config?.useStream || false,
        });
      }

      const _isStreaming = this.config?.useStream || false;

      const response = await this.node.useStream(
        new oAddress(RestrictedAddresses.INTELLIGENCE),
        {
          method: 'prompt',
          params: {
            prompt: prompt,
            userMessage: `<intent>${this.config?.intent}</intent>`,
            intent: this.config?.intent,
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

      if (process.env.VERBOSE === 'true') {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        this.logger.verbose('Intelligence raw AI message', {
          messageLength: messageStr.length,
          preview: messageStr.substring(0, 500) + (messageStr.length > 500 ? '...' : ''),
        });
      }

      // Use the parsed result value if available, otherwise fall back to full message
      const processedResult = RegexUtils.extractResultFromAI(message);

      // Extract structured fields from AI response
      // The AI returns JSON with fields like: type, summary, reasoning, result, etc.
      const { type } = processedResult;

      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('Intelligence parsed result', {
          determinedType: type || oCapabilityType.EVALUATE,
          resultKeys: processedResult && typeof processedResult === 'object' ? Object.keys(processedResult) : [],
          result: processedResult,
        });
      }

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
