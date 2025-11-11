import { oObject } from '@olane/o-core';
import { oCapabilityConfig } from './interfaces/o-capability.config.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityResult } from './o-capability.result.js';
import type { oLaneTool } from '../o-lane.tool.js';
import { oIntent } from '../intent/o-intent.js';

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

  cancel() {
    // do nothing
  }
}
