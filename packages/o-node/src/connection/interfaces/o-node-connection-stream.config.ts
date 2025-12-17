import { StreamReusePolicy } from '../stream-handler.config';

export interface oNodeConnectionStreamConfig {
  direction: 'inbound' | 'outbound';
  reusePolicy: StreamReusePolicy;
}
