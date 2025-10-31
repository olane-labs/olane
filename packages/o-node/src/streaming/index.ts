/**
 * Streaming functionality for o-node
 *
 * This module provides libp2p-specific implementations of the streaming
 * abstractions defined in o-core.
 */

// libp2p-specific stream transport
export { Libp2pStreamTransport } from './libp2p-stream-transport.js';

// o-node stream handler with metrics
export {
  NodeStreamHandler,
  NodeStreamHandlerOptions,
} from './node-stream-handler.js';

// o-node streaming client for client-side streaming orchestration
export { oNodeStreamingClient } from './o-node-streaming-client.js';
