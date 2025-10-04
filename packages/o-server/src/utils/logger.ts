export class ServerLogger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  log(...args: any[]) {
    console.log('[o-server]', ...args);
  }

  error(...args: any[]) {
    console.error('[o-server ERROR]', ...args);
  }

  debugLog(...args: any[]) {
    if (this.debug) {
      console.log('[o-server DEBUG]', ...args);
    }
  }
}
