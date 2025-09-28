import { oAddress, oError, oErrorCodes, oResponse } from '@olane/o-core';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result';
import { oCapability } from '../capabilities/o-capability';
import { oCapabilityTaskConfig } from './interfaces/o-capability.task-config';
import { oHandshakeResult, oLaneResult } from '../interfaces';
import { oLane } from '../o-lane';
import { oIntent } from '../intent';
import { oLaneContext } from '../o-lane.context';
import { oProtocolMethods } from '@olane/o-protocol';

export class oCapabilityTask extends oCapability {
  constructor(readonly config: oCapabilityTaskConfig) {
    super(config);
  }

  get task() {
    return this.config.task;
  }

  async handshake(): Promise<oResponse> {
    return this.node.use(new oAddress(this.task.address), {
      method: oProtocolMethods.HANDSHAKE,
      params: {
        intent: this.config.intent.value,
      },
    });
  }

  async run(): Promise<oCapabilityResult> {
    try {
      // do MCP handshake to get the method + parameters + dependencies
      const handshakeResponse = await this.handshake();

      const { result: handshakeResult } = handshakeResponse.result
        .data as oHandshakeResult;
      const { tools, methods } = handshakeResult;

      // spawn a new lane (intent workflow) to configure the tool use

      const pc = new oLane({
        ...this.config,
        sequence: this.sequence,
        intent: new oIntent(
          `This is a configure request, prioritize "Configure Request Instructions". You have already found the tool to resolve the user's intent: ${this.config.receiver}. Configure the request to use the tool with user intent: ${this.config.intent}`,
        ),
        context: new oLaneContext([
          `[Method Metadata Begin]\n${JSON.stringify(methods, null, 2)}\n[Method Metadata End]`,
          `[Method Options Begin]\n${(tools || []).join(', ')}\n[Method Options End]`,
        ]),
        extraInstructions: CONFIGURE_INSTRUCTIONS,
        parentId: this.id,
      });
      const result = await pc.execute();
      this.logger.debug('Configure result: ', result);
      const { configure, error: configureError }: oLaneResult = result;
      if (configureError) {
        return {
          error: configureError,
          type: 'error',
        };
      }
      if (!configure || !configure.task) {
        throw new oError(
          oErrorCodes.NOT_CONFIGURED,
          'Failed to configure the tool use',
        );
      }

      const { task } = configure;
      let params = task.payload?.params;
      params = await ObjectUtils.allKeyValues(params, async (key, val) => {
        let value = val;
        if (!oUsePlan.hasOlaneAddress(value)) {
          return value;
        }
        // extract the addresses & process them if LFS is needed
        this.logger.debug('Has olane address: ', value);
        const addresses = oUsePlan.extractAddresses(value);
        for (const address of addresses) {
          const largeDataResponse = await this.node.use(new oAddress(address));
          this.logger.debug(
            'Large data response: ',
            largeDataResponse.result.data,
          );
          value = value.replace(
            address,
            (largeDataResponse.result.data as any)?.value || 'unknown value',
          );
          this.logger.debug('Updated the value with LFS value: ', value);
        }
        return value;
      });
      const response = await this.node.use(this.config.receiver, {
        method: task.payload?.method,
        params: params,
      });

      return {
        result: `Tool input: ${JSON.stringify(task || {}, null, 2)}\nTool output: ${JSON.stringify(response.result, null, 2)}`,
        type: 'result',
      };
    } catch (error: any) {
      this.logger.error('Error executing use plan: ', error);
      if (error instanceof oToolError) {
        return {
          error: error.toString(),
          type: 'error',
        };
      }
      return {
        error: error?.message || error || 'Unknown error',
        type: 'error',
      };
    }
  }
}
