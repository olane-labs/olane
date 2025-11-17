import { oObject } from '@olane/o-core';
import { oToolBase } from '@olane/o-tool';
import { oCapabilityConfig } from './interfaces/o-capability.config.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityResult } from './o-capability.result.js';
import { oIntent } from '../intent/o-intent.js';

export abstract class oCapability extends oObject {
  public config!: oCapabilityConfig;
  abstract run(): Promise<oCapabilityResult>;

  get node(): oToolBase {
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
