import { oObject } from '@olane/o-core';
import { oToolBase } from '@olane/o-tool';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityResult } from './o-capability.result.js';
import { oIntent } from '../intent/o-intent.js';
import { PromptLoader } from '../storage/prompt-loader.js';
import { oCapabilityConfig } from './o-capability.config.js';
import { oNodeTool } from '@olane/o-node';

export abstract class oCapability extends oObject {
  protected promptLoader: PromptLoader;
  protected node: oToolBase;
  protected config?: oCapabilityConfig;

  constructor({promptLoader, node}: { promptLoader: PromptLoader, node: oToolBase }) {
    super();
    this.promptLoader = promptLoader;
    this.node = node;
  }


  abstract run(): Promise<oCapabilityResult>;

  async execute(config: oCapabilityConfig): Promise<oCapabilityResult> {
    this.config = config;
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Capability execute starting', {
        capabilityType: this.type,
        intent: config.intent?.value,
        isReplay: config.isReplay || false,
        paramsKeys: config.params && typeof config.params === 'object' ? Object.keys(config.params) : [],
      });
    }
    return this.run();
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
