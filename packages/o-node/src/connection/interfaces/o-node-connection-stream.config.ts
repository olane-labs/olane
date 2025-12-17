import { oAddress } from '@olane/o-core';
import { oNodeAddress } from '../../router';
import { StreamReusePolicy } from '../stream-handler.config';

export interface oNodeConnectionStreamConfig {
  direction: 'inbound' | 'outbound';
  reusePolicy: StreamReusePolicy;
  remoteAddress: oAddress;
}
