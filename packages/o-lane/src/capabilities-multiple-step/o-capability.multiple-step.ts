import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result.js';
import { oIntent } from '../intent/o-intent.js';
import { oCapabilityMultipleStepConfig } from './interfaces/o-capability.multiple-step-config.js';
import { oLane } from '../o-lane.js';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';

export class oCapabilityMultipleStep extends oCapabilityIntelligence {
  public config!: oCapabilityMultipleStepConfig;

  get type(): oCapabilityType {
    return oCapabilityType.MULTIPLE_STEP;
  }

  static get type() {
    return oCapabilityType.MULTIPLE_STEP;
  }

  get intents(): oIntent[] {
    return this.config.intents;
  }

  get explanation(): string {
    return this.config.explanation;
  }

  async run(): Promise<oCapabilityResult> {
    const results: oCapabilityResult[] = [];
    for (const intent of this.intents) {
      const subLane = new oLane({
        ...this.config.laneConfig,
        intent: intent,
        sequence: this.config.laneConfig.sequence,
        parentLaneId: this.config.parentLaneId,
      });
      const response = await subLane.execute();
      results.concat(response.sequence);
    }
    return {
      result: results,
      type: oCapabilityType.MULTIPLE_STEP,
    };
  }
}
