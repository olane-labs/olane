import { oRequest } from '@olane/o-core';
import type { Stream } from '@olane/o-config';
import type { StreamHandler } from '../stream-handler.js';

export interface StreamManagerConfig {
  /**
   * Stream handler for managing stream communication
   */
  streamHandler: StreamHandler;

  /**
   * Request handler for incoming requests on the dedicated reader
   */
  requestHandler?: (request: oRequest, stream: Stream) => Promise<any>;
}
