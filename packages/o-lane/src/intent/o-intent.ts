import { oObject } from '@olane/o-core';
import { oIntentConfig } from './interfaces/o-intent.config.js';

export class oIntent extends oObject {
  constructor(readonly config: oIntentConfig) {
    super();
  }

  get value(): string {
    return this.config.intent;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): any {
    return {
      intent: this.value,
    };
  }
}
