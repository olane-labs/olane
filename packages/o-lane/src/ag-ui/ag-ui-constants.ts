/**
 * AG-UI Protocol Constants
 */

/**
 * AG-UI protocol version this implementation supports
 */
export const AG_UI_PROTOCOL_VERSION = '1.0.0';

/**
 * Default configuration values
 */
export const AG_UI_DEFAULTS = {
  /**
   * Default state snapshot interval (every N cycles)
   */
  STATE_SNAPSHOT_INTERVAL: 5,

  /**
   * Maximum delta history to keep
   */
  MAX_DELTA_HISTORY: 100,

  /**
   * Default text chunk size for streaming
   */
  TEXT_CHUNK_SIZE: 100,

  /**
   * Enable debug logging by default
   */
  DEBUG_ENABLED: false,

  /**
   * Enable AG-UI by default
   */
  AGUI_ENABLED: true,

  /**
   * Emit activity events by default
   */
  EMIT_ACTIVITY_EVENTS: true,

  /**
   * Emit reasoning events by default
   */
  EMIT_REASONING_EVENTS: true,

  /**
   * Include raw events by default
   */
  INCLUDE_RAW_EVENTS: false,

  /**
   * Auto-generate thread ID by default
   */
  AUTO_GENERATE_THREAD_ID: true,
};

/**
 * Activity types for AG-UI activity events
 */
export const ACTIVITY_TYPES = {
  PLAN: 'PLAN',
  EXECUTE: 'EXECUTE',
  EVALUATE: 'EVALUATE',
  SEARCH: 'SEARCH',
  CONFIGURE: 'CONFIGURE',
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS',
} as const;

/**
 * Event type categories for filtering
 */
export const EVENT_CATEGORIES = {
  LIFECYCLE: [
    'RunStarted',
    'RunFinished',
    'RunError',
    'StepStarted',
    'StepFinished',
  ],
  MESSAGES: [
    'TextMessageStart',
    'TextMessageContent',
    'TextMessageEnd',
    'TextMessageChunk',
  ],
  TOOL_CALLS: [
    'ToolCallStart',
    'ToolCallArgs',
    'ToolCallEnd',
    'ToolCallResult',
    'ToolCallChunk',
  ],
  STATE: ['StateSnapshot', 'StateDelta', 'MessagesSnapshot'],
  ACTIVITY: ['ActivitySnapshot', 'ActivityDelta'],
  SPECIAL: ['Raw', 'Custom'],
  REASONING: [
    'ReasoningStart',
    'ReasoningEnd',
    'ReasoningMessageStart',
    'ReasoningMessageContent',
    'ReasoningMessageEnd',
    'ReasoningMessageChunk',
  ],
} as const;

/**
 * Default message roles
 */
export const MESSAGE_ROLES = {
  DEVELOPER: 'developer',
  SYSTEM: 'system',
  ASSISTANT: 'assistant',
  USER: 'user',
  TOOL: 'tool',
} as const;

/**
 * Run outcome types
 */
export const RUN_OUTCOMES = {
  SUCCESS: 'success',
  INTERRUPT: 'interrupt',
} as const;
