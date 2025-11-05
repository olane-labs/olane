import { CoreUtils, oAddress, oRequest, oResponse } from '@olane/o-core';
import {
  oNodeConfig,
  oNodeTool,
  oStreamRequest,
  StreamUtils,
} from '@olane/o-node';
import { oHandshakeResult } from './interfaces/index.js';
import { oCapabilityType } from './capabilities/index.js';
import { oIntent } from './intent/index.js';
import { oLaneContext } from './o-lane.context.js';
import { oLaneManager } from './manager/o-lane.manager.js';
import { oCapabilityResult } from './capabilities/o-capability.result.js';

export class oLaneTool extends oNodeTool {
  private manager: oLaneManager;

  constructor(config: oNodeConfig) {
    super(config);
    this.manager = new oLaneManager();
  }

  async _tool_handshake(handshake: oRequest): Promise<oHandshakeResult> {
    this.logger.debug(
      'Performing handshake with intent: ',
      handshake.params.intent,
    );

    let tools = await this.myTools();
    let methods = this.methods;

    const { tool }: { tool: string } = handshake.params as any;

    if (tool) {
      tools = tools.filter((t) => t === tool);
      methods = { tool: this.methods[tool] };
    }

    return new oCapabilityResult({
      result: {
        tools: tools.filter((t) => t !== 'handshake' && t !== 'intent'),
        methods: methods,
      },
      type: oCapabilityType.HANDSHAKE,
    });
  }

  /**
   * Where all intents go to be resolved.
   * @param request
   * @returns
   */
  async _tool_intent(request: oStreamRequest): Promise<any> {
    this.logger.debug('Intent resolution called: ', request.params);
    const { intent, context, streamTo, _isStreaming = false } = request.params;

    const pc = await this.manager.createLane({
      intent: new oIntent({ intent: intent as string }),
      currentNode: this,
      caller: this.address,
      streamTo: streamTo ? new oAddress(streamTo as string) : undefined,
      onChunk: _isStreaming
        ? async (chunk: any) => {
            await CoreUtils.sendStreamResponse(
              oResponse.fromJSON(chunk),
              request.stream,
            );
          }
        : undefined,
      context: context
        ? new oLaneContext([
            `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
          ])
        : undefined,
    });

    let response: oCapabilityResult | undefined;
    response = await pc.execute();

    return {
      result: response?.result,
      error: response?.error,
      cycles: pc.sequence.length,
      cid: pc.cid?.toString(),
      sequence: pc.sequence.map((s: oCapabilityResult) => {
        return s.result;
      }),
    };
  }

  /**
   * Replay a stored lane from storage by CID
   * This restores network state from a previously executed lane
   * @param request - Request containing the CID of the lane to replay
   * @returns The result of the replayed lane
   */
  async _tool_replay(request: oRequest): Promise<any> {
    this.logger.debug('Lane replay called: ', request.params);
    const { cid } = request.params;

    if (!cid || typeof cid !== 'string') {
      throw new Error('CID parameter is required and must be a string');
    }

    // Create a lane instance for replay
    const lane = await this.manager.createLane({
      intent: new oIntent({ intent: 'replay' }),
      currentNode: this,
      caller: this.address,
    });

    try {
      const response = await lane.replay(cid);
      this.logger.debug('Lane replay response: ', response);
      return {
        result: response?.result,
        error: response?.error,
        cycles: lane.sequence.length,
        cid: cid,
      };
    } catch (error) {
      this.logger.error('Lane replay failed: ', error);
      throw error;
    }
  }

  async teardown(): Promise<void> {
    await this.manager.teardown();
    await super.teardown();
  }
}
