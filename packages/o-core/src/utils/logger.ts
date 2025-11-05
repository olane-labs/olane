import debug, { Debugger } from 'debug';
import chalk from 'chalk';

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

  verbose(...args: any[]) {
    this.log(chalk.gray('[VERBOSE]'), ...args);
  }

  debug(...args: any[]) {
    this.log(chalk.blue('[DEBUG]'), ...args);
  }

  info(...args: any[]) {
    this.log(chalk.green('[INFO]'), ...args);
  }

  warn(...args: any[]) {
    this.log(chalk.yellow('[WARN]'), ...args);
  }

  error(...args: any[]) {
    this.log(chalk.red('[ERROR]'), ...args);
  }

  alert(...args: any[]) {
    this.log(chalk.redBright('[ALERT]'), ...args);
  }
}
