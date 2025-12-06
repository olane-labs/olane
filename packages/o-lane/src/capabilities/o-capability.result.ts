
import { oCapabilityType } from './enums/o-capability.type-enum.js';
import { oCapabilityConfig } from './o-capability.config.js';
import { oCapabilityResultInterface } from './interfaces/o-capability.result-interface.js';
import { v4 as uuidv4 } from 'uuid';

export class oCapabilityResult implements oCapabilityResultInterface {
  id: string;
  result?: any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;
  shouldPersist?: boolean;

  constructor(config: oCapabilityResultInterface) {
    this.id = uuidv4();
    this.result = config.result;
    this.type = config.type || oCapabilityType.UNKNOWN;
    this.config = config.config;
    this.error = config.error;
  }

  toJSON() {
    return {
      id: this.id,
      result: this.result,
      type: this.type,
      error: this.error,
      config: this.config?.toJSON()
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}
