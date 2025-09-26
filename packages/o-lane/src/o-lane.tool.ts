import { oRequest } from '@olane/o-core';
import { oTool } from '@olane/o-tool';

export class oLaneTool extends oTool(oNode) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }

  async _tool_handshake(handshake: oRequest): Promise<any> {
    this.logger.debug(
      'Performing handshake with intent: ',
      handshake.params.intent,
    );

    const mytools = await this.myTools();

    return {
      tools: mytools.filter((t) => t !== 'handshake' && t !== 'intent'),
      methods: this.methods,
      successes: [],
      failures: [],
      task: undefined,
      type: 'handshake',
    };
  }

  /**
   * Where all intents go to be resolved.
   * @param request
   * @returns
   */
  async _tool_intent(request: oRequest): Promise<any> {
    this.logger.debug('Intent resolution called: ', request.params);
    const { intent, context, streamTo } = request.params;
    const pc = new oAgentPlan({
      intent: intent as string,
      currentNode: this,
      caller: this.address,
      streamTo: new oAddress(streamTo as string),
      context: context
        ? new oPlanContext([
            `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
          ])
        : undefined,
      shouldContinue: () => {
        return !!this.requests[request.id];
      },
    });

    const response = await pc.execute();
    return {
      ...response,
      cycles: pc.sequence.length,
      sequence: pc.sequence.map((s) => {
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
