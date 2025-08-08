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
}
