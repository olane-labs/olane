import { oCapabilityMultipleStepConfig } from '../capabilities-multiple-step/interfaces/o-capability.multiple-step-config.js';
import { oCapabilitySearchConfig } from '../capabilities-search/interfaces/o-capability.search-config.js';
import { oCapabilityTaskConfig } from '../capabilities-task/interfaces/o-capability.task-config.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityConfig } from './interfaces/o-capability.config.js';
import { oCapabilityResultInterface } from './interfaces/o-capability.result-interface.js';
import { v4 as uuidv4 } from 'uuid';

export class oCapabilityResult implements oCapabilityResultInterface {
  id: string;
  result?:
    | oCapabilitySearchConfig
    | oCapabilityMultipleStepConfig
    | oCapabilityTaskConfig
    | any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;
  shouldPersist?: boolean;

  constructor(config: oCapabilityResultInterface) {
    this.id = uuidv4();
    this.result = config.result;
    this.type = config.type || oCapabilityType.UNKNOWN;
    this.error = config.error || '';
    this.config = config.config;
    this.shouldPersist = config.shouldPersist;
  }

  toJSON() {
    return {
      id: this.id,
      result: this.result,
      type: this.type,
      error: this.error,
      shouldPersist: this.shouldPersist,
      config: {
        intent: this.config?.intent,
        params: this.config?.params,
        history: this.config?.history,
      },
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}
