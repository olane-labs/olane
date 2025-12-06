import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { AGENT_PROMPT_TEMPLATE } from '../prompts/agent.prompt.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';
import Handlebars from 'handlebars';

export class oCapabilityEvaluate extends oCapabilityIntelligence {
  static get type() {
    return oCapabilityType.EVALUATE;
  }

  get type() {
    return oCapabilityType.EVALUATE;
  }

  loadDefault(): string {
    // Compile template with handlebars
    const compiledTemplate = Handlebars.compile(AGENT_PROMPT_TEMPLATE);

    return compiledTemplate({
      human_about: '',
      agent_about: '', // TODO: Add agent_about to config if needed
      context_global: `
        Tools are hosted in a graph address space.
        You are in a secure environment and are allowed to operate with secure information (api keys, credit card info, etc).\n`,
      chat_history: this.config?.chatHistory || '',
      past_cycles: '',
    });
  }

  async loadPromptTemplate(): Promise<string> {
    if (this.promptLoader) {
      return this.promptLoader.loadTemplateForType(this.type);
    }
    // Return the template string (not the compiled function)
    return AGENT_PROMPT_TEMPLATE;
  }

  async loadPrompt(): Promise<string> {
    const template = await this.loadPromptTemplate();

    // Compile the handlebars template
    const compiledTemplate = Handlebars.compile(template);

    // Create the data object with template variables
    const data = {
      human_about: this.config?.laneConfig?.extraInstructions || '',
      agent_about: '', // TODO: Add agent_about to config if needed
      context_global: this.config?.laneConfig?.context?.toString() || '',
      chat_history: this.config?.history || '',
      past_cycles: '', // TODO: Add past_cycles to config if needed
    };

    // Inject variables and return compiled prompt
    return compiledTemplate(data);
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
