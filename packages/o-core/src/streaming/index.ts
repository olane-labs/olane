/**
 * Streaming functionality for o-core
 *
 * This module provides transport-agnostic abstractions for streaming operations
 * that can be used by o-node, o-client, o-browser, and other implementations.
 */

// Stream transport interface and types
export {
  IStreamTransport,
  StreamStatus,
  StreamTransportConfig,
} from './stream-transport.interface.js';

// Stream configuration
export {
  StreamConfig,
  DEFAULT_STREAM_CONFIG,
  mergeStreamConfig,
} from './stream-config.js';

// Protocol builder for JSON-RPC streaming messages
export {
  ProtocolBuilder,
  ParsedStreamChunk,
} from './protocol-builder.js';

// Base stream handler class
export {
  StreamHandlerBase,
  StreamHandlerState,
  StreamHandlerOptions,
} from './stream-handler.base.js';
