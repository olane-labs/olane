import { oCapabilityConfig } from '../../capabilities/o-capability.config.js';
import { oMethod } from '@olane/o-protocol';

export interface oCapabilityExecuteConfig extends oCapabilityConfig {
  params: {
    address: string;
    intent: string;
    handshakeResult: {
      tools: string[];
      methods: { [key: string]: oMethod };
    };
    taskConfig: {
      method: string;
      params: any;
    };
    task?: {
      address: string;
      intent?: string;
    };
  };
}
