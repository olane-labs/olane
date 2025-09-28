import {
  oAddress,
  ObjectUtils,
  oError,
  oErrorCodes,
  oResponse,
} from '@olane/o-core';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result';
import { oCapability } from '../capabilities/o-capability';
import { oCapabilityTaskConfig } from './interfaces/o-capability.task-config';
import { oHandshakeResult, oLaneResult } from '../interfaces';
import { oLane } from '../o-lane';
import { oIntent } from '../intent';
import { oLaneContext } from '../o-lane.context';
import { oProtocolMethods } from '@olane/o-protocol';
import { oCapabilityConfigure } from '../capabilities-configure/o-capability.configure';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum';
import { oCapabilityConfigureResult } from '../capabilities-configure/interfaces/o-capability.configure-result';
import { oCapabilityTaskResult } from './interfaces/o-capability.task-result';

export class oCapabilityTask extends oCapability {
  public config!: oCapabilityTaskConfig;

  get task() {
    return this.config.task;
  }

  get type(): oCapabilityType {
    return oCapabilityType.TASK;
  }

  static get type() {
    return oCapabilityType.TASK;
  }

  async run(): Promise<oCapabilityTaskResult> {
    try {
      // do MCP handshake to get the method + parameters + dependencies

      const { task } = this.config;
      if (!task || !task.address) {
        throw new oError(
          oErrorCodes.NOT_CONFIGURED,
          'Failed to configure the tool use',
        );
      }

      const params = task.payload?.params;
      // params = await ObjectUtils.allKeyValues(params, async (key, val) => {
      //   let value = val;
      //   if (!oUsePlan.hasOlaneAddress(value)) {
      //     return value;
      //   }
      //   // extract the addresses & process them if LFS is needed
      //   this.logger.debug('Has olane address: ', value);
      //   const addresses = oUsePlan.extractAddresses(value);
      //   for (const address of addresses) {
      //     const largeDataResponse = await this.node.use(new oAddress(address));
      //     this.logger.debug(
      //       'Large data response: ',
      //       largeDataResponse.result.data,
      //     );
      //     value = value.replace(
      //       address,
      //       (largeDataResponse.result.data as any)?.value || 'unknown value',
      //     );
      //     this.logger.debug('Updated the value with LFS value: ', value);
      //   }
      //   return value;
      // });
      const response = await this.node.use(new oAddress(task.address), {
        method: task.payload?.method,
        params: params,
      });

      return {
        result: `Tool input: ${JSON.stringify(task || {}, null, 2)}\nTool output: ${JSON.stringify(response.result, null, 2)}`,
        type: oCapabilityType.RESULT,
      };
    } catch (error: any) {
      this.logger.error('Error executing task capability: ', error);
      if (error instanceof oError) {
        return {
          error: error.toString(),
          type: oCapabilityType.ERROR,
        };
      }
      return {
        error: error?.message || error || 'Unknown error',
        type: oCapabilityType.ERROR,
      };
    }
  }
}
