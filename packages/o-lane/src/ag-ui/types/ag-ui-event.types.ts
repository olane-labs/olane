/**
 * AG-UI Protocol Event Types
 * Based on AG-UI Protocol specification
 * https://docs.ag-ui.com/concepts/events
 */

/**
 * Base event structure that all AG-UI events extend
 */
export interface BaseEvent {
  type: string;
  timestamp?: string;
  rawEvent?: unknown;
}

/**
 * Role types for messages
 */
export type MessageRole = 'developer' | 'system' | 'assistant' | 'user' | 'tool';

/**
 * Run outcome types
 */
export type RunOutcome = 'success' | 'interrupt';

/**
 * JSON Patch operation for state deltas
 */
export interface JSONPatchOperation {
  op: string;
  path: string;
  value?: unknown;
}

// ==================== Lifecycle Events ====================

/**
 * RunStarted - First event emitted when an agent begins processing
 */
export interface RunStarted extends BaseEvent {
  type: 'RunStarted';
  threadId: string;
  runId: string;
  parentRunId?: string;
  input?: unknown;
}

/**
 * RunFinished - Indicates agent has successfully completed all work
 */
export interface RunFinished extends BaseEvent {
  type: 'RunFinished';
  threadId: string;
  runId: string;
  result?: unknown;
  outcome?: RunOutcome;
  interrupt?: unknown;
}

/**
 * RunError - Indicates an error occurred during execution
 */
export interface RunError extends BaseEvent {
  type: 'RunError';
  message: string;
  code?: string;
}

/**
 * StepStarted - Indicates agent is beginning a specific subtask
 */
export interface StepStarted extends BaseEvent {
  type: 'StepStarted';
  stepName: string;
}

/**
 * StepFinished - Indicates agent has completed a specific subtask
 */
export interface StepFinished extends BaseEvent {
  type: 'StepFinished';
  stepName: string;
}

// ==================== Text Message Events ====================

/**
 * TextMessageStart - Initiates a new text message stream
 */
export interface TextMessageStart extends BaseEvent {
  type: 'TextMessageStart';
  messageId: string;
  role: MessageRole;
}

/**
 * TextMessageContent - Delivers incremental message content
 */
export interface TextMessageContent extends BaseEvent {
  type: 'TextMessageContent';
  messageId: string;
  delta: string;
}

/**
 * TextMessageEnd - Marks completion of a text message
 */
export interface TextMessageEnd extends BaseEvent {
  type: 'TextMessageEnd';
  messageId: string;
}

/**
 * TextMessageChunk - Convenience event for chunked message delivery
 */
export interface TextMessageChunk extends BaseEvent {
  type: 'TextMessageChunk';
  messageId?: string;
  role?: MessageRole;
  delta?: string;
}

// ==================== Tool Call Events ====================

/**
 * ToolCallStart - Signals the start of a tool call
 */
export interface ToolCallStart extends BaseEvent {
  type: 'ToolCallStart';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

/**
 * ToolCallArgs - Delivers incremental parts of tool arguments
 */
export interface ToolCallArgs extends BaseEvent {
  type: 'ToolCallArgs';
  toolCallId: string;
  delta: string;
}

/**
 * ToolCallEnd - Marks completion of a tool call
 */
export interface ToolCallEnd extends BaseEvent {
  type: 'ToolCallEnd';
  toolCallId: string;
}

/**
 * ToolCallResult - Delivers the output from a tool invocation
 */
export interface ToolCallResult extends BaseEvent {
  type: 'ToolCallResult';
  messageId: string;
  toolCallId: string;
  content: unknown;
  role?: 'tool';
}

/**
 * ToolCallChunk - Convenience event for chunked tool call delivery
 */
export interface ToolCallChunk extends BaseEvent {
  type: 'ToolCallChunk';
  toolCallId?: string;
  toolCallName?: string;
  parentMessageId?: string;
  delta?: string;
}

// ==================== State Management Events ====================

/**
 * StateSnapshot - Full state initialization/resync
 */
export interface StateSnapshot extends BaseEvent {
  type: 'StateSnapshot';
  snapshot: unknown;
}

/**
 * StateDelta - Incremental state updates using JSON Patch
 */
export interface StateDelta extends BaseEvent {
  type: 'StateDelta';
  delta: JSONPatchOperation[];
}

/**
 * MessagesSnapshot - Snapshot of message history
 */
export interface MessagesSnapshot extends BaseEvent {
  type: 'MessagesSnapshot';
  messages: unknown[];
}

// ==================== Activity Events ====================

/**
 * ActivitySnapshot - Shows current agent activity
 */
export interface ActivitySnapshot extends BaseEvent {
  type: 'ActivitySnapshot';
  messageId: string;
  activityType: string;
  content: unknown;
  replace?: boolean;
}

/**
 * ActivityDelta - Incremental activity updates
 */
export interface ActivityDelta extends BaseEvent {
  type: 'ActivityDelta';
  messageId: string;
  activityType: string;
  patch: JSONPatchOperation[];
}

// ==================== Special Events ====================

/**
 * Raw - Pass-through for external system events
 */
export interface Raw extends BaseEvent {
  type: 'Raw';
  event: unknown;
  source?: string;
}

/**
 * Custom - Application-specific custom events
 */
export interface Custom extends BaseEvent {
  type: 'Custom';
  name: string;
  value: unknown;
}

// ==================== Draft Events ====================

/**
 * ReasoningStart - Start of reasoning process (draft feature)
 */
export interface ReasoningStart extends BaseEvent {
  type: 'ReasoningStart';
  messageId: string;
  encryptedContent?: string;
}

/**
 * ReasoningEnd - End of reasoning process (draft feature)
 */
export interface ReasoningEnd extends BaseEvent {
  type: 'ReasoningEnd';
  messageId: string;
}

/**
 * ReasoningMessageStart - Start of reasoning message (draft feature)
 */
export interface ReasoningMessageStart extends BaseEvent {
  type: 'ReasoningMessageStart';
  messageId: string;
}

/**
 * ReasoningMessageContent - Reasoning message content (draft feature)
 */
export interface ReasoningMessageContent extends BaseEvent {
  type: 'ReasoningMessageContent';
  messageId: string;
  delta: string;
}

/**
 * ReasoningMessageEnd - End of reasoning message (draft feature)
 */
export interface ReasoningMessageEnd extends BaseEvent {
  type: 'ReasoningMessageEnd';
  messageId: string;
}

/**
 * ReasoningMessageChunk - Reasoning message chunk (draft feature)
 */
export interface ReasoningMessageChunk extends BaseEvent {
  type: 'ReasoningMessageChunk';
  messageId?: string;
  delta?: string;
}

/**
 * MetaEvent - Meta-level event information (draft feature)
 */
export interface MetaEvent extends BaseEvent {
  type: 'MetaEvent';
  metaType: string;
  payload: unknown;
}

// ==================== Union Type ====================

/**
 * Union of all AG-UI event types
 */
export type AGUIEvent =
  | RunStarted
  | RunFinished
  | RunError
  | StepStarted
  | StepFinished
  | TextMessageStart
  | TextMessageContent
  | TextMessageEnd
  | TextMessageChunk
  | ToolCallStart
  | ToolCallArgs
  | ToolCallEnd
  | ToolCallResult
  | ToolCallChunk
  | StateSnapshot
  | StateDelta
  | MessagesSnapshot
  | ActivitySnapshot
  | ActivityDelta
  | Raw
  | Custom
  | ReasoningStart
  | ReasoningEnd
  | ReasoningMessageStart
  | ReasoningMessageContent
  | ReasoningMessageEnd
  | ReasoningMessageChunk
  | MetaEvent;

/**
 * Event type string literal union
 */
export type EventType =
  | 'RunStarted'
  | 'RunFinished'
  | 'RunError'
  | 'StepStarted'
  | 'StepFinished'
  | 'TextMessageStart'
  | 'TextMessageContent'
  | 'TextMessageEnd'
  | 'TextMessageChunk'
  | 'ToolCallStart'
  | 'ToolCallArgs'
  | 'ToolCallEnd'
  | 'ToolCallResult'
  | 'ToolCallChunk'
  | 'StateSnapshot'
  | 'StateDelta'
  | 'MessagesSnapshot'
  | 'ActivitySnapshot'
  | 'ActivityDelta'
  | 'Raw'
  | 'Custom'
  | 'ReasoningStart'
  | 'ReasoningEnd'
  | 'ReasoningMessageStart'
  | 'ReasoningMessageContent'
  | 'ReasoningMessageEnd'
  | 'ReasoningMessageChunk'
  | 'MetaEvent';
