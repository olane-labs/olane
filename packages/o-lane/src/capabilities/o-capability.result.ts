import { oCapabilityType } from './enums/o-capability.type-enum';
import { oCapabilityConfig } from './interfaces/o-capability.config';
import { oCapabilityResultInterface } from './interfaces/o-capability.result-interface';
import { v4 as uuidv4 } from 'uuid';

export class oCapabilityResult implements oCapabilityResultInterface {
  id: string;
  result?: any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;

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
