import { oAddress, oRequest } from '@olane/o-core';
import { oNodeConfig, oNodeTool } from '@olane/o-node';
import { oHandshakeResult } from './interfaces/index.js';
import {
  oCapabilityResultInterface,
  oCapabilityType,
} from './capabilities/index.js';
import { oIntent } from './intent/index.js';
import { oLaneContext } from './o-lane.context.js';
import { oLaneManager } from './manager/o-lane.manager.js';
import { v4 as uuidv4 } from 'uuid';
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

    const mytools = await this.myTools();

    return new oCapabilityResult({
      result: {
        tools: mytools.filter((t) => t !== 'handshake' && t !== 'intent'),
        methods: this.methods,
      },
      type: oCapabilityType.HANDSHAKE,
    });
  }

  /**
   * Where all intents go to be resolved.
   * @param request
   * @returns
   */
  async _tool_intent(request: oRequest): Promise<any> {
    this.logger.debug('Intent resolution called: ', request.params);
    const { intent, context, streamTo } = request.params;
    const pc = await this.manager.createLane({
      intent: new oIntent({ intent: intent as string }),
      currentNode: this,
      caller: this.address,
      streamTo: new oAddress(streamTo as string),
      context: context
        ? new oLaneContext([
            `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
          ])
        : undefined,
    });

    const response = await pc.execute();
    return {
      ...response,
      cycles: pc.sequence.length,
      sequence: pc.sequence.map((s: oCapabilityResult) => {
        return {
          reasoning: s.result?.reasoning,
          result: s.result?.result,
          error: s.result?.error,
          type: s.result?.type,
        };
      }),
    };
  }
}
