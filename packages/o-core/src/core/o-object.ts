import { Logger } from '../utils/logger.js';

export class oObject {
  public logger: Logger;
  constructor(name?: string) {
    this.logger = new Logger(this.constructor.name + (name ? `:${name}` : ''));
  }
}
