import { oObject } from '@olane/o-core';
import { oToolBase } from '@olane/o-tool';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityResult } from './o-capability.result.js';
import { oIntent } from '../intent/o-intent.js';
import { PromptLoader } from '../storage/prompt-loader.js';
import { oCapabilityConfig } from './o-capability.config.js';

export abstract class oCapability extends oObject {
  public config!: oCapabilityConfig;
  protected promptLoader?: PromptLoader;

  constructor(promptLoader?: PromptLoader) {
    super();
    this.promptLoader = promptLoader;
  }


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
