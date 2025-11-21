import { oNodeConfig } from '@olane/o-node';
import { AGUITransport } from '../transports/ag-ui-transport.interface.js';

/**
 * Configuration for AG-UI oLane Tool
 */
export interface AGUIoLaneConfig extends oNodeConfig {
  /**
   * AG-UI event transport mechanism
   * Determines how events are delivered to the frontend
   */
  agUITransport?: AGUITransport;

  /**
   * Enable AG-UI event streaming
   * @default true
   */
  enableAGUI?: boolean;

  /**
   * Filter events to emit (if undefined, all events are emitted)
   * Useful for reducing event volume or focusing on specific event types
   */
  eventFilter?: string[];

  /**
   * Enable debug logging for AG-UI events
   * @default false
   */
  debugAGUI?: boolean;

  /**
   * Emit state snapshots every N cycles (0 = only deltas, undefined = snapshots + deltas)
   * @default 5
   */
  stateSnapshotInterval?: number;

  /**
   * Maximum delta history to keep for state reconstruction
   * @default 100
   */
  maxDeltaHistory?: number;
}

/**
 * Configuration for event mapping behavior
 */
export interface AGUIEventMappingConfig {
  /**
   * Include raw oLane events in AG-UI Raw events
   * @default false
   */
  includeRawEvents?: boolean;

  /**
   * Emit activity events for capability execution progress
   * @default true
   */
  emitActivityEvents?: boolean;

  /**
   * Emit reasoning events for EVALUATE capability
   * @default true
   */
  emitReasoningEvents?: boolean;

  /**
   * Chunk size for streaming large text content
   * @default 100
   */
  textChunkSize?: number;

  /**
   * Generate thread ID from lane context if not provided
   * @default true
   */
  autoGenerateThreadId?: boolean;
}

/**
 * Context for event emission during lane execution
 */
export interface AGUIEventContext {
  /**
   * Unique identifier for the thread (conversation)
   */
  threadId: string;

  /**
   * Unique identifier for this run (lane execution)
   */
  runId: string;

  /**
   * Parent run ID for sub-lanes
   */
  parentRunId?: string;

  /**
   * Current message ID for text message events
   */
  currentMessageId?: string;

  /**
   * Current tool call ID for tool call events
   */
  currentToolCallId?: string;

  /**
   * Previous state snapshot for delta generation
   */
  previousState?: unknown;

  /**
   * Mapping of capability cycles to message IDs
   */
  cycleToMessageId?: Map<number, string>;

  /**
   * Mapping of task capabilities to tool call IDs
   */
  taskToToolCallId?: Map<string, string>;
}
