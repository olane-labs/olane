import { oIntent } from '../intent/o-intent.js';
import { oCapabilityMultipleStepConfig } from './interfaces/o-capability.multiple-step-config.js';
import { oLane } from '../o-lane.js';
import { oCapabilityIntelligence } from '../capabilities/o-capability.intelligence.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oCapabilityMultipleStep extends oCapabilityIntelligence {
  public config!: oCapabilityMultipleStepConfig;

  get type(): oCapabilityType {
    return oCapabilityType.MULTIPLE_STEP;
  }

  static get type() {
    return oCapabilityType.MULTIPLE_STEP;
  }

  get intents(): oIntent[] {
    return this.config.params.intents;
  }

  get explanation(): string {
    return this.config.params.explanation;
  }

  async run(): Promise<oCapabilityResult> {
    const results: oCapabilityResult[] = [];
    for (const intent of this.intents) {
      this.logger.debug('Running intent: ', intent);
      const subLane = new oLane({
        ...this.config.laneConfig,
        intent: intent,
        sequence: this.config.laneConfig.sequence,
        parentLaneId: this.config.parentLaneId,
      });
      await subLane.execute();
      results.concat(subLane.sequence);
    }
    return new oCapabilityResult({
      result: results,
      type: oCapabilityType.EVALUATE,
    });
  }
}
