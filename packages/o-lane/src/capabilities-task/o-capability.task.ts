import { oAddress, oError, oErrorCodes } from '@olane/o-core';
import { oCapability } from '../capabilities/o-capability.js';
import { oCapabilityTaskConfig } from './interfaces/o-capability.task-config.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityTaskResult } from './o-capability.task-result.js';
import { oCapabilityConfigure } from '../capabilities-configure/o-capability.configure.js';

export class oCapabilityTask extends oCapability {
  public config!: oCapabilityTaskConfig;

  get task() {
    return this.config.params.task;
  }

  get type(): oCapabilityType {
    return oCapabilityType.TASK;
  }

  static get type() {
    return oCapabilityType.TASK;
  }

  // async doConfigure(): Promise<oCapabilityTaskResult> {
  //   const c = new oCapabilityConfigure({
  //     intent: this.intent,
  //     params: {}
  //     node: this.node,
  //   });
  //   return c.run();
  // }

  async run(): Promise<oCapabilityTaskResult> {
    try {
      // do MCP handshake to get the method + parameters + dependencies
      this.logger.debug('Running task: ', this.config);

      const { task } = this.config.params;
      this.logger.debug('Task to do: ', task);
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

      return new oCapabilityTaskResult({
        result: `Tool Address Use output: ${JSON.stringify(response.result, null, 2)}`,
        type: oCapabilityType.EVALUATE,
        config: this.config,
      });
    } catch (error: any) {
      this.logger.error('Error executing task capability: ', error);
      if (error instanceof oError) {
        return new oCapabilityTaskResult({
          error: error.toString(),
          type: oCapabilityType.ERROR,
          config: this.config,
        });
      }
      return new oCapabilityTaskResult({
        error: error?.message || error || 'Unknown error',
        type: oCapabilityType.ERROR,
        config: this.config,
      });
    }
  }
}
