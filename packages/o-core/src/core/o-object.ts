import { Logger } from '../utils/logger.js';

export class oObject {
  public logger: Logger;
  constructor(name?: string) {
    this.logger = new Logger(this.constructor.name + (name ? `:${name}` : ''));
  }

  static log(...args: any[]) {
    const l = new Logger(this.constructor.name);
    l.debug(...args);
  }
}
