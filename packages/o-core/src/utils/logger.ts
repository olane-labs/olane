import debug, { Debugger } from 'debug';
import chalk from 'chalk';

export class Logger {
  private log: Debugger;

  constructor(private readonly name: string) {
    this.log = debug('olane-os:' + name);
  }

  setNamespace(name: string) {
    this.log = debug('olane-os:' + name);
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
