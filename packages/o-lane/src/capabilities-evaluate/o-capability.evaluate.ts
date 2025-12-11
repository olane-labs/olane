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
    const prompt = await this.promptLoader?.loadPromptForType(this.type, {
      human_about: '',
      agent_about: '',
      context_global: `
        Tools are hosted in a graph address space.
        You are in a secure environment and are allowed to operate with secure information (api keys, credit card info, etc).`,
      chat_history: '',
      past_cycles: this.config?.history,
    })
    return prompt.render();
  }

  async run(): Promise<oCapabilityResult> {
    if (!this.config?.intent) {
      throw new Error('Invalid intent passed');
    }
    const prompt = await this.loadPrompt();
    const response = await this.intelligence(prompt);
    return response;
  }
}
