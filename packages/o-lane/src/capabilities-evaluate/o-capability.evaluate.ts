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
      context_global: '',
      chat_history: '',
      past_cycles: '',
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
