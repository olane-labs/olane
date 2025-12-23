import type { Connection } from '@libp2p/interface';
import { oRequest } from '@olane/o-core';
import type { Stream } from '@olane/o-config';
import type { oNodeConnectionStream } from '../o-node-connection-stream.js';
import type { StreamHandler } from '../stream-handler.js';

export interface StreamPoolManagerConfig {
  /**
   * Pool size (total number of streams to maintain)
   * Default: 10 (1 dedicated reader + 9 request-response)
   */
  poolSize?: number;

  /**
   * Index of the dedicated reader stream in the pool
   * Default: 0
   */
  readerStreamIndex?: number;

  /**
   * Stream handler for managing stream communication
   */
  streamHandler: StreamHandler;

  /**
   * P2P connection for creating streams
   */
  p2pConnection: Connection;

  /**
   * Request handler for incoming requests on the dedicated reader
   */
  requestHandler?: (request: oRequest, stream: Stream) => Promise<any>;

  /**
   * Function to create a new stream
   */
  createStream: () => Promise<oNodeConnectionStream>;
}

export interface StreamPoolStats {
  totalStreams: number;
  healthyStreams: number;
  readerStreamHealth: 'healthy' | 'unhealthy' | 'not-initialized';
  requestResponseStreams: number;
  failureCount: number;
}
