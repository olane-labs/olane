import { oObject } from '@olane/o-core';
import { oCapabilityConfig } from './interfaces/o-capability.config';
import { oCapabilityType } from './enums/o-capability.type-enum';
import { oCapabilityResult } from './interfaces/o-capability.result';
import type { oLaneTool } from '../o-lane.tool';
import { oIntent } from '../intent';

export abstract class oCapability extends oObject {
  public config!: oCapabilityConfig;

  abstract run(): Promise<oCapabilityResult>;

  get node(): oLaneTool {
    return this.config.node;
  }

  async execute(config: oCapabilityConfig): Promise<oCapabilityResult> {
    this.config = config;
    return this.run();
  }

  get intent(): oIntent {
    return this.config.intent;
  }

  get type() {
    return oCapabilityType.UNKNOWN;
  }

  static get type() {
    return oCapabilityType.UNKNOWN;
  }
}
