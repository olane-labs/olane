import { oToolErrorCodes } from './enums/codes.error.js';
export interface oToolErrorInterface {
  code: number;
  message: string;
  details?: any;
}

export class oToolError extends Error implements oToolErrorInterface {
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
      return new oToolError(json.code, json.message, json.details);
    }
    return new oToolError(oToolErrorCodes.TOOL_ERROR, json, json?.details);
  }

  toString() {
    return `OLANE ERROR CODE: ${this.code}\nMESSAGE: ${this.message}\n-----\nDETAILS: ${this.details}`;
  }
}
