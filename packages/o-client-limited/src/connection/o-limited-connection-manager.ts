import { oNodeConnectionConfig, oNodeConnectionManager } from '@olane/o-node';

export class oLimitedConnectionManager extends oNodeConnectionManager {
  private readonly _token?: string;
}
