import { oLaneTool } from '../o-lane.tool.js';
import {
  AGUIoLaneConfig,
  AGUIEventContext,
} from './types/ag-ui-config.interface.js';
import { AGUIEventMapper } from './ag-ui-event-mapper.js';
import { AGUIStreamManager } from './ag-ui-stream-manager.js';
import { ONodeAGUITransport } from './transports/onode-transport.js';
import { ConsoleAGUITransport } from './transports/console-transport.js';
import { oIntent } from '../intent/o-intent.js';
import { oLaneContext } from '../o-lane.context.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oRequest, oAddress } from '@olane/o-core';
import { oStreamRequest } from '@olane/o-node';
import {
  generateRunId,
  generateThreadId,
  generateTimestamp,
} from './ag-ui-utils.js';
import { AG_UI_DEFAULTS } from './ag-ui-constants.js';

/**
 * AG-UI compatible oLane Tool
 * Extends oLaneTool with AG-UI event streaming capabilities
 */
export class AGUIoLaneTool extends oLaneTool {
  private agUIConfig: AGUIoLaneConfig;
  protected manager: any; // Lane manager from mixin

  constructor(config: AGUIoLaneConfig) {
    super(config);
    this.agUIConfig = {
      ...config,
      enableAGUI: config.enableAGUI ?? AG_UI_DEFAULTS.AGUI_ENABLED,
      debugAGUI: config.debugAGUI ?? AG_UI_DEFAULTS.DEBUG_ENABLED,
      stateSnapshotInterval:
        config.stateSnapshotInterval ?? AG_UI_DEFAULTS.STATE_SNAPSHOT_INTERVAL,
      maxDeltaHistory:
        config.maxDeltaHistory ?? AG_UI_DEFAULTS.MAX_DELTA_HISTORY,
    };
  }

  /**
   * AG-UI compatible intent method with full event streaming
   * This is the main entry point for AG-UI enabled intent resolution
   */
  async _tool_ag_ui_intent(request: oStreamRequest): Promise<any> {
    const {
      intent,
      context,
      threadId: providedThreadId,
      _isStreaming = false,
    } = request.params;
    this.logger.debug('AG-UI intent received:', request.params);

    // Generate IDs
    const runId = generateRunId();
    const threadId = providedThreadId || generateThreadId(context as string);

    // Create AG-UI event context
    const eventContext: AGUIEventContext = {
      threadId,
      runId,
      parentRunId: undefined,
      cycleToMessageId: new Map(),
      taskToToolCallId: new Map(),
    };

    // Create event mapper
    const eventMapper = new AGUIEventMapper(eventContext, {
      emitActivityEvents: this.agUIConfig.debugAGUI,
      emitReasoningEvents: true,
      textChunkSize: AG_UI_DEFAULTS.TEXT_CHUNK_SIZE,
    });

    // Create transport
    const transport =
      this.agUIConfig.agUITransport || this.createDefaultTransport(request);

    // Create stream manager
    const streamManager = new AGUIStreamManager({
      transport,
      debug: this.agUIConfig.debugAGUI,
      eventFilter: this.agUIConfig.eventFilter,
      validateEvents: true,
    });

    try {
      // Emit RunStarted
      await streamManager.emit(
        eventMapper.mapLaneStartToRunStarted(
          new oIntent({ intent: intent as string }),
          { intent, context },
        ),
      );

      // Emit preflight step
      await streamManager.emit(
        eventMapper.mapCapabilityStartToStepStarted(oCapabilityType.UNKNOWN),
      );

      // Create lane with AG-UI event emission hooks
      let previousSequence: oCapabilityResult[] = [];
      let cycleNumber = 0;

      const lane = await this.manager.createLane({
        intent: new oIntent({ intent: intent as string }),
        currentNode: this,
        caller: this.address,
        useStream: _isStreaming,
        requestId: request.id,
        onChunk: async (chunk: any) => {
          console.log('Chunk received:', chunk);
          // Emit chunk as activity event for real-time progress
          // Note: This fires AFTER addSequence has emitted full capability events,
          // so ActivitySnapshot provides a complementary progress update
          try {
            const activityEvent = eventMapper.mapChunkToActivity(
              chunk,
              cycleNumber,
            );
            console.log('Activity event:', activityEvent);
            await streamManager.emit(activityEvent);
          } catch (error) {
            this.logger.error('Error mapping chunk to activity:', error);
          }
        },
        context: context
          ? new oLaneContext([
              `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
            ])
          : undefined,
      });

      // Emit preflight complete
      await streamManager.emit(
        eventMapper.mapCapabilityEndToStepFinished(oCapabilityType.UNKNOWN),
      );

      // Override lane's addSequence to emit events as capabilities execute
      const originalAddSequence = lane.addSequence.bind(lane);
      lane.addSequence = (result: oCapabilityResult) => {
        // Call original method
        originalAddSequence(result);

        // Emit AG-UI events asynchronously
        (async () => {
          try {
            cycleNumber++;

            // Emit step started
            await streamManager.emit(
              eventMapper.mapCapabilityStartToStepStarted(result.type),
            );

            // Map capability to events
            const events = eventMapper.mapCapabilityToEvents(
              result,
              cycleNumber,
            );
            await streamManager.emitBatch(events);

            // Emit state updates
            if (
              this.agUIConfig.stateSnapshotInterval &&
              cycleNumber % this.agUIConfig.stateSnapshotInterval === 0
            ) {
              // Emit full snapshot
              await streamManager.emit(
                eventMapper.mapSequenceToStateSnapshot(lane.sequence),
              );
            } else {
              // Emit delta
              const delta = eventMapper.mapSequenceToStateDelta(
                previousSequence,
                lane.sequence,
              );
              if (delta) {
                await streamManager.emit(delta);
              }
            }

            previousSequence = [...lane.sequence];

            // Emit step finished
            await streamManager.emit(
              eventMapper.mapCapabilityEndToStepFinished(result.type),
            );
          } catch (error) {
            this.logger.error('Error emitting AG-UI events:', error);
          }
        })();
      };

      // Execute the lane
      let result: oCapabilityResult | undefined;
      let error: Error | undefined;

      try {
        result = await lane.execute();

        // Emit final state snapshot
        await streamManager.emit(
          eventMapper.mapSequenceToStateSnapshot(lane.sequence),
        );

        // Emit RunFinished
        if (result) {
          await streamManager.emit(
            eventMapper.mapLaneCompleteToRunFinished(result),
          );
        }
      } catch (err) {
        error = err as Error;
        this.logger.error('Lane execution error:', error);

        // Emit RunError
        await streamManager.emit(eventMapper.mapLaneErrorToRunError(error));
      }

      // Flush any remaining events
      await streamManager.flushQueue();

      // Return standard response
      const completeResponse = {
        result: result?.result,
        humanResult: result?.humanResult,
        summary: result?.config?.params?.summary,
        error: error?.message || result?.error,
        cycles: lane.sequence.length,
        cid: lane.cid?.toString(),
        threadId,
        runId,
        sequence: lane.sequence.map((s: oCapabilityResult) => s.result),
      };

      return completeResponse;
    } finally {
      // Close stream manager
      await streamManager.close();
    }
  }

  /**
   * Standard intent method - optionally enable AG-UI if configured
   * Overrides the base _tool_intent to add AG-UI support
   */
  async _tool_intent(request: oStreamRequest): Promise<any> {
    // If AG-UI is enabled, use AG-UI intent method
    if (this.agUIConfig.enableAGUI) {
      return this._tool_ag_ui_intent(request);
    }

    // Otherwise, call the parent implementation
    // Use the standard lane execution from withLane mixin
    const { intent, context, streamTo, _isStreaming = false } = request.params;

    const lane = await this.manager.createLane({
      intent: new oIntent({ intent: intent as string }),
      currentNode: this,
      caller: this.address,
      streamTo: streamTo ? new oAddress(streamTo as string) : undefined,
      useStream: _isStreaming,
      requestId: request.id,
      context: context
        ? new oLaneContext([
            `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
          ])
        : undefined,
    });

    const response = await lane.execute();

    return {
      result: response?.result,
      humanResult: response?.humanResult,
      summary: response?.config?.params?.summary,
      error: response?.error,
      cycles: lane.sequence.length,
      cid: lane.cid?.toString(),
      sequence: lane.sequence.map((s: oCapabilityResult) => s.result),
    };
  }

  /**
   * Receive AG-UI event from remote sources
   * Allows other tools to send events to this tool
   */
  async _tool_receive_ag_ui_event(request: oRequest): Promise<any> {
    const { event } = request.params;
    this.logger.debug('Received AG-UI event:', event);

    // Handle the event (can be extended for custom logic)
    return {
      received: true,
      eventType: event.type,
      timestamp: generateTimestamp(),
    };
  }

  /**
   * Create default transport based on request configuration
   */
  private createDefaultTransport(request: oStreamRequest): any {
    // If streaming is enabled and we have a stream, use ONode transport
    if (request.params._isStreaming && request.stream) {
      return new ONodeAGUITransport({
        stream: request.stream,
        node: this,
        requestId: request.id,
        streamTo: request.params.streamTo
          ? new oAddress(request.params.streamTo as string)
          : undefined,
      });
    }

    // Otherwise, use console transport for debugging
    return new ConsoleAGUITransport(this.agUIConfig.debugAGUI);
  }

  /**
   * Enable or disable AG-UI at runtime
   */
  setAGUIEnabled(enabled: boolean): void {
    this.agUIConfig.enableAGUI = enabled;
  }

  /**
   * Check if AG-UI is enabled
   */
  isAGUIEnabled(): boolean {
    return this.agUIConfig.enableAGUI || false;
  }

  /**
   * Get AG-UI configuration
   */
  getAGUIConfig(): AGUIoLaneConfig {
    return { ...this.agUIConfig };
  }
}
