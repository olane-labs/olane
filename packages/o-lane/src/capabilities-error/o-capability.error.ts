import { oError } from '@olane/o-core';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oCapabilityErrorConfig } from './interfaces/o-capability.error-config.js';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result.js';

export class oCapabilityError extends oCapabilityIntelligence {
  constructor(readonly config: oCapabilityErrorConfig) {
    super(config);
  }

  generatePrompt(error: oError): string {
    return `If this error is already indicating that the user intent is solved, return a result otherwise solve it. The error is: ${error}`;
  }

  async run(): Promise<oCapabilityResult> {
    const { error } = this.config;
    const prompt = this.generatePrompt(error);
    const { result } = await this.intelligence(prompt);
    return result;
  }
}
