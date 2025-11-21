import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';
import { oIntent } from '../intent/o-intent.js';
import {
  AGUIEvent,
  RunStarted,
  RunFinished,
  RunError,
  StepStarted,
  StepFinished,
  TextMessageStart,
  TextMessageContent,
  TextMessageEnd,
  ToolCallStart,
  ToolCallArgs,
  ToolCallEnd,
  ToolCallResult,
  StateSnapshot,
  StateDelta,
  ActivitySnapshot,
  Custom,
} from './types/ag-ui-event.types.js';
import {
  AGUIEventContext,
  AGUIEventMappingConfig,
} from './types/ag-ui-config.interface.js';
import {
  generateMessageId,
  generateToolCallId,
  generateTimestamp,
  generateJSONPatch,
  chunkString,
  capabilityTypeToStepName,
  safeJSONStringify,
} from './ag-ui-utils.js';
import { AG_UI_DEFAULTS, ACTIVITY_TYPES } from './ag-ui-constants.js';

/**
 * Maps oLane execution events to AG-UI protocol events
 */
export class AGUIEventMapper {
  private config: AGUIEventMappingConfig;
  private context: AGUIEventContext;

  constructor(
    context: AGUIEventContext,
    config: Partial<AGUIEventMappingConfig> = {},
  ) {
    this.context = context;
    this.config = {
      includeRawEvents:
        config.includeRawEvents ?? AG_UI_DEFAULTS.INCLUDE_RAW_EVENTS,
      emitActivityEvents:
        config.emitActivityEvents ?? AG_UI_DEFAULTS.EMIT_ACTIVITY_EVENTS,
      emitReasoningEvents:
        config.emitReasoningEvents ?? AG_UI_DEFAULTS.EMIT_REASONING_EVENTS,
      textChunkSize: config.textChunkSize ?? AG_UI_DEFAULTS.TEXT_CHUNK_SIZE,
      autoGenerateThreadId:
        config.autoGenerateThreadId ?? AG_UI_DEFAULTS.AUTO_GENERATE_THREAD_ID,
    };
  }

  /**
   * Map lane creation to RunStarted event
   */
  mapLaneStartToRunStarted(intent: oIntent, input?: unknown): RunStarted {
    return {
      type: 'RunStarted',
      threadId: this.context.threadId,
      runId: this.context.runId,
      parentRunId: this.context.parentRunId,
      input: input || { intent: intent.value },
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map lane completion to RunFinished event
   */
  mapLaneCompleteToRunFinished(result: oCapabilityResult): RunFinished {
    return {
      type: 'RunFinished',
      threadId: this.context.threadId,
      runId: this.context.runId,
      result: result.result,
      outcome: 'success',
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map lane error to RunError event
   */
  mapLaneErrorToRunError(error: Error | string): RunError {
    const message = typeof error === 'string' ? error : error.message;
    return {
      type: 'RunError',
      message,
      code:
        typeof error === 'object' && 'code' in error
          ? (error as any).code
          : undefined,
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map capability execution start to StepStarted event
   */
  mapCapabilityStartToStepStarted(
    capabilityType: oCapabilityType,
  ): StepStarted {
    return {
      type: 'StepStarted',
      stepName: capabilityTypeToStepName(capabilityType),
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map capability execution end to StepFinished event
   */
  mapCapabilityEndToStepFinished(
    capabilityType: oCapabilityType,
  ): StepFinished {
    return {
      type: 'StepFinished',
      stepName: capabilityTypeToStepName(capabilityType),
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map capability result to appropriate AG-UI events
   * This is the core mapping logic that handles different capability types
   */
  mapCapabilityToEvents(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    const events: AGUIEvent[] = [];

    // Map based on capability type
    switch (result.type) {
      case oCapabilityType.EVALUATE:
        events.push(...this.mapEvaluateCapability(result, cycleNumber));
        break;

      case oCapabilityType.TASK:
        events.push(...this.mapTaskCapability(result, cycleNumber));
        break;

      case oCapabilityType.SEARCH:
        events.push(...this.mapSearchCapability(result, cycleNumber));
        break;

      case oCapabilityType.CONFIGURE:
        events.push(...this.mapConfigureCapability(result, cycleNumber));
        break;

      case oCapabilityType.MULTIPLE_STEP:
        events.push(...this.mapMultipleStepCapability(result, cycleNumber));
        break;

      case oCapabilityType.ERROR:
        events.push(...this.mapErrorCapability(result, cycleNumber));
        break;

      case oCapabilityType.STOP:
        // STOP doesn't generate events - it's handled at the lane level
        break;

      default:
        // Unknown capability type - emit as custom event
        events.push(this.mapUnknownCapability(result, cycleNumber));
        break;
    }

    return events;
  }

  /**
   * Map EVALUATE capability to text message events (agent reasoning)
   */
  private mapEvaluateCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    const events: AGUIEvent[] = [];
    const messageId = generateMessageId();

    // Store message ID for this cycle
    if (!this.context.cycleToMessageId) {
      this.context.cycleToMessageId = new Map();
    }
    this.context.cycleToMessageId.set(cycleNumber, messageId);
    this.context.currentMessageId = messageId;

    // Start message
    events.push({
      type: 'TextMessageStart',
      messageId,
      role: 'assistant',
      timestamp: generateTimestamp(),
    } as TextMessageStart);

    // Extract reasoning/summary from result
    const reasoning =
      result.config?.params?.reasoning ||
      result.config?.params?.summary ||
      result.result?.reasoning ||
      result.result?.summary ||
      'Evaluating next steps...';

    const content =
      typeof reasoning === 'string' ? reasoning : safeJSONStringify(reasoning);

    // Chunk the content for streaming effect
    if (
      this.config.textChunkSize &&
      content.length > this.config.textChunkSize
    ) {
      const chunks = chunkString(content, this.config.textChunkSize);
      for (const chunk of chunks) {
        events.push({
          type: 'TextMessageContent',
          messageId,
          delta: chunk,
          timestamp: generateTimestamp(),
        } as TextMessageContent);
      }
    } else {
      events.push({
        type: 'TextMessageContent',
        messageId,
        delta: content,
        timestamp: generateTimestamp(),
      } as TextMessageContent);
    }

    // End message
    events.push({
      type: 'TextMessageEnd',
      messageId,
      timestamp: generateTimestamp(),
    } as TextMessageEnd);

    return events;
  }

  /**
   * Map TASK capability to tool call events
   */
  private mapTaskCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    const events: AGUIEvent[] = [];
    const toolCallId = generateToolCallId();
    const messageId = this.context.currentMessageId || generateMessageId();

    // Store tool call ID
    if (!this.context.taskToToolCallId) {
      this.context.taskToToolCallId = new Map();
    }
    this.context.taskToToolCallId.set(`cycle-${cycleNumber}`, toolCallId);
    this.context.currentToolCallId = toolCallId;

    // Extract tool information
    const toolName =
      result.config?.params?.task?.address ||
      result.config?.params?.tool ||
      'task';

    // Tool call start
    events.push({
      type: 'ToolCallStart',
      toolCallId,
      toolCallName: String(toolName),
      parentMessageId: messageId,
      timestamp: generateTimestamp(),
    } as ToolCallStart);

    // Tool call arguments
    const args =
      result.config?.params?.task?.payload || result.config?.params || {};
    const argsStr = safeJSONStringify(args);

    events.push({
      type: 'ToolCallArgs',
      toolCallId,
      delta: argsStr,
      timestamp: generateTimestamp(),
    } as ToolCallArgs);

    // Tool call end
    events.push({
      type: 'ToolCallEnd',
      toolCallId,
      timestamp: generateTimestamp(),
    } as ToolCallEnd);

    // Tool call result
    events.push({
      type: 'ToolCallResult',
      messageId,
      toolCallId,
      content: result.result || result.error || null,
      role: 'tool',
      timestamp: generateTimestamp(),
    } as ToolCallResult);

    return events;
  }

  /**
   * Map SEARCH capability to activity events
   */
  private mapSearchCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    if (!this.config.emitActivityEvents) {
      return [];
    }

    const messageId = generateMessageId();

    return [
      {
        type: 'ActivitySnapshot',
        messageId,
        activityType: ACTIVITY_TYPES.SEARCH,
        content: {
          cycle: cycleNumber,
          query: result.config?.params?.query || 'searching...',
          results: result.result,
        },
        replace: true,
        timestamp: generateTimestamp(),
      } as ActivitySnapshot,
    ];
  }

  /**
   * Map CONFIGURE capability to activity events
   */
  private mapConfigureCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    if (!this.config.emitActivityEvents) {
      return [];
    }

    const messageId = generateMessageId();

    return [
      {
        type: 'ActivitySnapshot',
        messageId,
        activityType: ACTIVITY_TYPES.CONFIGURE,
        content: {
          cycle: cycleNumber,
          configuration: result.config?.params || {},
          status: result.error ? 'failed' : 'completed',
        },
        replace: true,
        timestamp: generateTimestamp(),
      } as ActivitySnapshot,
    ];
  }

  /**
   * Map MULTIPLE_STEP capability to activity events
   */
  private mapMultipleStepCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    if (!this.config.emitActivityEvents) {
      return [];
    }

    const messageId = generateMessageId();

    return [
      {
        type: 'ActivitySnapshot',
        messageId,
        activityType: ACTIVITY_TYPES.PLAN,
        content: {
          cycle: cycleNumber,
          steps: result.result?.steps || [],
          currentStep: result.result?.currentStep || 0,
        },
        replace: true,
        timestamp: generateTimestamp(),
      } as ActivitySnapshot,
    ];
  }

  /**
   * Map ERROR capability to activity events
   */
  private mapErrorCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): AGUIEvent[] {
    const messageId = generateMessageId();

    return [
      {
        type: 'ActivitySnapshot',
        messageId,
        activityType: ACTIVITY_TYPES.ERROR,
        content: {
          cycle: cycleNumber,
          error: result.error || 'Unknown error',
          recovery: result.result || 'Attempting recovery...',
        },
        replace: true,
        timestamp: generateTimestamp(),
      } as ActivitySnapshot,
    ];
  }

  /**
   * Map unknown capability to custom event
   */
  private mapUnknownCapability(
    result: oCapabilityResult,
    cycleNumber: number,
  ): Custom {
    return {
      type: 'Custom',
      name: `capability_${result.type}`,
      value: {
        cycle: cycleNumber,
        result: result.result,
        error: result.error,
      },
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map execution sequence to state snapshot
   */
  mapSequenceToStateSnapshot(sequence: oCapabilityResult[]): StateSnapshot {
    return {
      type: 'StateSnapshot',
      snapshot: {
        sequence: sequence.map((s) => ({
          type: s.type,
          result: s.result,
          error: s.error,
          id: s.id,
        })),
        cycleCount: sequence.length,
      },
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map execution sequence update to state delta
   */
  mapSequenceToStateDelta(
    oldSequence: oCapabilityResult[],
    newSequence: oCapabilityResult[],
  ): StateDelta | null {
    const oldState = {
      sequence: oldSequence.map((s) => ({
        type: s.type,
        result: s.result,
        error: s.error,
        id: s.id,
      })),
      cycleCount: oldSequence.length,
    };

    const newState = {
      sequence: newSequence.map((s) => ({
        type: s.type,
        result: s.result,
        error: s.error,
        id: s.id,
      })),
      cycleCount: newSequence.length,
    };

    const delta = generateJSONPatch(oldState, newState);

    if (delta.length === 0) {
      return null;
    }

    return {
      type: 'StateDelta',
      delta,
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Map streaming chunk to activity event
   * Extracts capability result from oResponse wrapper and maps appropriately
   */
  mapChunkToActivity(chunk: any, cycleNumber: number): ActivitySnapshot {
    const messageId = generateMessageId();

    // Extract capability result from oResponse wrapper
    // Structure: { data: { id, result, humanResult, type, error, ... }, _last, _isStreaming, ... }
    const capabilityData = chunk.data || chunk;
    const capabilityType = capabilityData.type as oCapabilityType;
    const result = capabilityData.result;
    const humanResult = capabilityData.humanResult;
    const error = capabilityData.error;

    // Determine activity type based on capability type
    let activityType: string;
    let content: any;

    switch (capabilityType) {
      case oCapabilityType.EVALUATE:
        activityType = ACTIVITY_TYPES.EVALUATE;
        content = {
          cycle: cycleNumber,
          reasoning: result?.reasoning || result?.summary || humanResult,
          status: error ? 'error' : 'evaluating',
        };
        break;

      case oCapabilityType.TASK:
        activityType = ACTIVITY_TYPES.EXECUTE;
        content = {
          cycle: cycleNumber,
          task: result?.task?.address || result?.tool || 'task',
          status: error ? 'error' : 'executing',
          result: humanResult || result,
        };
        break;

      case oCapabilityType.SEARCH:
        activityType = ACTIVITY_TYPES.SEARCH;
        content = {
          cycle: cycleNumber,
          query: result?.query || 'searching',
          results: result?.results || result,
          status: error ? 'error' : 'searching',
        };
        break;

      case oCapabilityType.CONFIGURE:
        activityType = ACTIVITY_TYPES.CONFIGURE;
        content = {
          cycle: cycleNumber,
          configuration: result,
          status: error ? 'error' : 'configuring',
        };
        break;

      case oCapabilityType.ERROR:
        activityType = ACTIVITY_TYPES.ERROR;
        content = {
          cycle: cycleNumber,
          error: error || result?.error || 'Unknown error',
          recovery: result?.recovery || result?.message,
          status: 'error',
        };
        break;

      case oCapabilityType.MULTIPLE_STEP:
        activityType = ACTIVITY_TYPES.PLAN;
        content = {
          cycle: cycleNumber,
          steps: result?.steps || [],
          currentStep: result?.currentStep || 0,
          status: error ? 'error' : 'planning',
        };
        break;

      case oCapabilityType.STOP:
        activityType = ACTIVITY_TYPES.EXECUTE;
        content = {
          cycle: cycleNumber,
          status: 'completed',
          result: humanResult || result,
        };
        break;

      default:
        // Unknown capability type - provide generic progress
        activityType = ACTIVITY_TYPES.PROGRESS;
        content = {
          cycle: cycleNumber,
          type: capabilityType,
          result: humanResult || result,
          status: error ? 'error' : 'processing',
        };
        break;
    }

    // Add error details if present
    if (error) {
      content.error = error;
    }

    return {
      type: 'ActivitySnapshot',
      messageId,
      activityType,
      content,
      replace: false, // Don't replace - show progress updates
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Update the event context
   */
  updateContext(updates: Partial<AGUIEventContext>): void {
    Object.assign(this.context, updates);
  }

  /**
   * Get current context
   */
  getContext(): AGUIEventContext {
    return { ...this.context };
  }
}
