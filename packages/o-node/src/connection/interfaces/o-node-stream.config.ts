import { oAddress } from '@olane/o-core';
import { oNodeAddress } from '../../router';
import { StreamReusePolicy } from '../stream-handler.config';

/**
 * Stream type defines the role and usage pattern of a stream:
 * - 'dedicated-reader': Stream exclusively used for reading incoming requests (background reader)
 * - 'request-response': Stream used for outgoing request-response cycles
 * - 'general': Stream with no specific role (default, backward compatible)
 */
export type StreamType = 'dedicated-reader' | 'request-response' | 'general';

export interface oNodeStreamConfig {
  direction: 'inbound' | 'outbound';
  reusePolicy: StreamReusePolicy;
  remoteAddress: oAddress;
  streamType?: StreamType; // Optional for backward compatibility
}
