import { oNodeConfig } from '@olane/o-node';

export interface oAgentConfig extends oNodeConfig {
  respond: (intent: string) => Promise<string>;
  answer: (intent: string) => Promise<string>;
  receiveStream: (data: any) => Promise<any>;
}
