import { oCapabilityConfig } from '../capabilities/interfaces/o-capability.config';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result';
import { oCapability } from '../capabilities/o-capability';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum';
import { oIntent } from '../intent/o-intent.js';
import { oCapabilityMultipleStepConfig } from './interfaces/o-capability.multiple-step-config';
import { oLane } from '../o-lane';

export class oCapabilityMultipleStep extends oCapability {
  constructor(readonly config: oCapabilityMultipleStepConfig) {
    super(config);
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
        ...this.config,
        intent: intent,
        sequence: this.sequence,
        parentId: this.id,
      });
      const response = await subLane.execute();
      results.push(response);
    }
    return {
      result: results,
      type: 'multiple_step',
    };
  }
}
