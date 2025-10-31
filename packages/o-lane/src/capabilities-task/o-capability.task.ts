import { oAddress, oError, oErrorCodes } from '@olane/o-core';
import { oCapability } from '../capabilities/o-capability.js';
import { oCapabilityTaskConfig } from './interfaces/o-capability.task-config.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityTaskResult } from './o-capability.task-result.js';

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

      // Check if we're in replay mode
      if (this.config.isReplay) {
        this.logger.debug(
          'Task is being replayed - re-executing to restore state',
        );
      }

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

      // Request approval before executing the task
      try {
        const approvalResponse = await this.node.use(
          new oAddress('o://approval'),
          {
            method: 'request_approval',
            params: {
              toolAddress: task.address,
              method: task.payload?.method,
              params: params,
              intent: this.config.intent,
            },
          },
        );

        const approved = (approvalResponse.result.data as any)?.approved;
        if (!approved) {
          const decision =
            (approvalResponse.result.data as any)?.decision || 'denied';
          this.logger.warn(
            `Task execution denied by approval system: ${decision}`,
          );
          throw new oError(
            oErrorCodes.NOT_AUTHORIZED,
            `Action denied by approval system: ${decision}`,
          );
        }

        this.logger.debug('Task approved, proceeding with execution');
      } catch (error: any) {
        // If approval service is not available, log warning and continue
        // This ensures backward compatibility
        if (error.message?.includes('No route found')) {
          this.logger.warn(
            'Approval service not available, proceeding without approval check',
          );
        } else {
          throw error;
        }
      }

      const response = await this.node.use(new oAddress(task.address), {
        method: task.payload?.method,
        params: params,
      });
      if (this.config.onChunk) {
        this.config.onChunk(response);
      }

      // Check if the tool response contains _save flag
      const shouldPersist = (response.result?.data as any)?._save === true;
      if (shouldPersist) {
        this.logger.debug(
          'Tool response contains _save flag - lane will be persisted to config',
        );
      }

      return new oCapabilityTaskResult({
        result: `Tool Address Use output: ${JSON.stringify(response.result, null, 2)}`,
        type: oCapabilityType.EVALUATE,
        config: this.config,
        shouldPersist,
      });
    } catch (error: any) {
      this.logger.error('Error executing task capability: ', error);
      if (error instanceof oError) {
        return new oCapabilityTaskResult({
          error: error.toString(),
          type: oCapabilityType.EVALUATE,
          config: this.config,
        });
      }
      return new oCapabilityTaskResult({
        error: error?.message || error || 'Unknown error',
        type: oCapabilityType.EVALUATE,
        config: this.config,
      });
    }
  }
}
