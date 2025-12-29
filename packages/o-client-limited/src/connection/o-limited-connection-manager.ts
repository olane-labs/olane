import { oNodeConnectionConfig, oNodeConnectionManager } from '@olane/o-node';
import { oConnectionConfig } from '@olane/o-core';
import { oLimitedConnection } from './o-limited-connection.js';

export class oLimitedConnectionManager extends oNodeConnectionManager {
  private readonly _token?: string;
}
