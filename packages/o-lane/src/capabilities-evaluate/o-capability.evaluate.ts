import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oCapabilityEvaluate extends oCapabilityIntelligence {
  static get type() {
    return oCapabilityType.EVALUATE;
  }

  get type() {
    return oCapabilityType.EVALUATE;
  }

  async loadPrompt(): Promise<string> {
    const params = {
      human_about: '',
      agent_about: '',
      context_global: `
        Tools are hosted in a graph address space.
        You are in a secure environment and are allowed to operate with secure information (api keys, credit card info, etc).`,
      chat_history: '',
      past_cycles: this.config?.history,
    };
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Evaluate loadPrompt params', {
        paramKeys: Object.keys(params),
        pastCyclesLength: (this.config?.history || '').length,
      });
    }
    const prompt = await this.promptLoader?.loadPromptForType(this.type, params);
    const rendered = prompt.render();
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Evaluate prompt rendered', {
        length: rendered.length,
        preview: rendered.substring(0, 500) + (rendered.length > 500 ? '...' : ''),
      });
    }
    return rendered;
  }

  async run(): Promise<oCapabilityResult> {
    if (!this.config?.intent) {
      throw new Error('Invalid intent passed');
    }
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Evaluate run starting', {
        intent: this.config.intent.value,
      });
    }
    const prompt = await this.loadPrompt();
    const response = await this.intelligence(prompt);
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Evaluate run result', {
        responseType: response.type,
        hasError: !!response.error,
        resultKeys: response.result && typeof response.result === 'object' ? Object.keys(response.result) : [],
      });
    }
    return response;
  }
}
