import debug, { Debugger } from 'debug';
import chalk from 'chalk';

export class Logger {
  private log: Debugger;

  constructor(private readonly name: string) {
    this.log = debug('o-protocol:' + name);
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
