import debug, { Debugger } from 'debug';
import chalk from 'chalk';
import { oRequestContext } from '../context/o-request-context.js';

export class Logger {
  private log: Debugger;
  private suffix: string = '';

  constructor(private readonly name: string) {
    this.suffix = process.env.LOG_ID ? process.env.LOG_ID + ':' : '';
    this.log = debug('olane-os:' + this.suffix + name);
  }

  setNamespace(name: string) {
    this.log = debug('olane-os:' + this.suffix + name);
  }

  private tracePrefix(): string {
    const reqId = oRequestContext.getRequestId?.();
    if (!reqId) return '';
    return `[${reqId}] `;
  }

  verbose(...args: any[]) {
    this.log(chalk.gray('[VERBOSE]'), this.tracePrefix(), ...args);
  }

  debug(...args: any[]) {
    this.log(chalk.blue('[DEBUG]'), this.tracePrefix(), ...args);
  }

  info(...args: any[]) {
    this.log(chalk.green('[INFO]'), this.tracePrefix(), ...args);
  }

  warn(...args: any[]) {
    this.log(chalk.yellow('[WARN]'), this.tracePrefix(), ...args);
  }

  error(...args: any[]) {
    this.log(chalk.red('[ERROR]'), this.tracePrefix(), ...args);
  }

  alert(...args: any[]) {
    this.log(chalk.redBright('[ALERT]'), this.tracePrefix(), ...args);
  }
}
