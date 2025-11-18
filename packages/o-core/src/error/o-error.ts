import { oErrorCodes } from './enums/codes.error.js';
import { oErrorInterface } from './interfaces/o-error.interface.js';

export class oError extends Error implements oErrorInterface {
  code: number = 0;
  details?: any;
  message: string = '';

  constructor(code: number, message: string, details?: any) {
    super(message);
    this.code = code;
    this.message = message;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  static fromJSON(json: any) {
    if (json?.code && json?.message) {
      return new oError(json.code, json.message, json.details);
    }
    return new oError(oErrorCodes.UNKNOWN, json, json?.details);
  }

  toString() {
    let details = this.details;
    try {
      details = JSON.stringify(this.details);
    } catch (e) {
      console.warn('Error serializing details: ', e);
    }
    return `OLANE ERROR CODE: ${this.code}\nMESSAGE: ${this.message}\n-----\nDETAILS: ${details}`;
  }
}
