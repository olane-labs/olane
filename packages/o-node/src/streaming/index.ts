/**
 * Streaming functionality for o-node
 *
 * This module provides libp2p-specific implementations of the streaming
 * abstractions defined in o-core.
 */

// Re-export o-core streaming abstractions for convenience
export * from '../../../o-core/src/streaming/index.js';

// libp2p-specific stream transport
export { Libp2pStreamTransport } from './libp2p-stream-transport.js';

// o-node stream handler with metrics
export {
  NodeStreamHandler,
  NodeStreamHandlerOptions,
} from './node-stream-handler.js';
