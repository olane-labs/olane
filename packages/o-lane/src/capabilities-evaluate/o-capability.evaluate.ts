import { oCapabilityConfig } from '../capabilities/interfaces/o-capability.config.js';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result.js';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { AGENT_PROMPT } from '../prompts/agent.prompt.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';

export class oCapabilityEvaluate extends oCapabilityIntelligence {
  static get type() {
    return oCapabilityType.EVALUATE;
  }

  get type() {
    return oCapabilityType.EVALUATE;
  }

  async run(): Promise<oCapabilityResult> {
    const { result } = await this.intelligence(
      AGENT_PROMPT(
        this.config.intent.value,
        this.config.laneConfig.context?.toString() || '',
        '',
        this.config.laneConfig.extraInstructions || '',
      ),
    );
    return result;
  }
}
