import { oCapabilityErrorConfig } from '../capabilities-error/interfaces/o-capability.error-config.js';
import { oCapabilityMultipleStepConfig } from '../capabilities-multiple-step/interfaces/o-capability.multiple-step-config.js';
import { oCapabilitySearchConfig } from '../capabilities-search/interfaces/o-capability.search-config.js';
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityConfig } from './interfaces/o-capability.config.js';
import { oCapabilityResultInterface } from './interfaces/o-capability.result-interface.js';
import { v4 as uuidv4 } from 'uuid';

export class oCapabilityResult implements oCapabilityResultInterface {
  id: string;
  result?:
    | oCapabilitySearchConfig
    | oCapabilityErrorConfig
    | oCapabilityMultipleStepConfig
    | any;
  type: oCapabilityType;
  error?: string;
  config: oCapabilityConfig;

  constructor(config: oCapabilityResultInterface) {
    this.id = uuidv4();
    this.result = config.result;
    this.type = config.type || oCapabilityType.UNKNOWN;
    this.error = config.error || '';
    this.config = config.config;
  }

  toJSON() {
    return {
      id: this.id,
      result: this.result,
      type: this.type,
      error: this.error,
      config: this.config,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}
