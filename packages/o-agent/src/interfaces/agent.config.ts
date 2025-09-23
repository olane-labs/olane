import { CoreConfig } from '@olane/o-core';

export interface oAgentConfig extends CoreConfig {
  respond: (intent: string) => Promise<string>;
  answer: (intent: string) => Promise<string>;
  receiveStream: (data: any) => Promise<any>;
}
