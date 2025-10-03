import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { AGENT_PROMPT } from '../prompts/agent.prompt.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oCapabilityEvaluate extends oCapabilityIntelligence {
  static get type() {
    return oCapabilityType.EVALUATE;
  }

  get type() {
    return oCapabilityType.EVALUATE;
  }

  async run(): Promise<oCapabilityResult> {
    const response = await this.intelligence(
      AGENT_PROMPT(
        this.config.intent.value,
        this.config.laneConfig.context?.toString() || '',
        this.config.history || '',
        this.config.laneConfig.extraInstructions || '',
      ),
    );
    return response;
  }
}
