import { oAddress, oDependency, oResponse } from '../../core/index.js';
import { oPlan } from '../o-lane.js';
import { oPlanType } from '../interfaces/o-lane-type.enum.js';
import { oPlanResult } from '../interfaces/o-lane.result.js';
import { oToolError } from '../../error/tool.error.js';
import { oToolErrorCodes } from '../../error/enums/codes.error.js';
import { oLaneContext } from '../o-lane.context.js';
import { oHandshakeResult } from '../interfaces/handshake.result.js';
import { oAgentPlan } from '../o-lane.agent.js';
import { CONFIGURE_INSTRUCTIONS } from '../prompts/configure.prompt.js';
import { v4 as uuidv4 } from 'uuid';
import { ObjectUtils } from '../../utils/object.utils.js';

/**
 * We know what tool we want to use, let's use it.
 */
export class oLaneUse extends oPlan {
  type() {
    return oPlanType.USE;
  }

  async handleDependencies(dependencies: oDependency[]): Promise<oResponse[]> {
    const response: oResponse[] = [];
    for (const dependency of dependencies) {
      // TODO: we need to handle the method for the dependency
      const result = await this.node.use(new oAddress(dependency.address), {});
      response.push(result);
    }
    return response;
  }

  static hasOlaneAddress(value: string): boolean {
    return (
      !!value &&
      typeof value === 'string' &&
      !!value?.match(/o:\/\/.*(placeholder)+(?:\/[\w.-]+)+/g)
    );
  }

  static extractAddresses(value: string): string[] {
    const matches = value.matchAll(/o:\/\/.*(placeholder)+(?:\/[\w.-]+)+/g);
    return Array.from(matches, (match) => match[0]);
  }

  async run(): Promise<oPlanResult> {
    this.logger.debug('Running...');
    if (!this.config.receiver) {
      throw new Error('Receiver is required');
    }

    try {
      // do MCP handshake to get the method + parameters + dependencies
      const handshakeResponse = await this.node.use(this.config.receiver, {
        method: 'handshake',
        params: {
          intent: this.config.intent,
        },
      });

      const { tools, methods, successes, failures } = handshakeResponse.result
        .data as oHandshakeResult;

      const pc = new oAgentPlan({
        ...this.config,
        sequence: this.sequence,
        intent: `This is a configure request, prioritize "Configure Request Instructions". You have already found the tool to resolve the user's intent: ${this.config.receiver}. Configure the request to use the tool with user intent: ${this.config.intent}`,
        context: new oLaneContext([
          `[Method Metadata Begin]\n${JSON.stringify(methods, null, 2)}\n[Method Metadata End]`,
          `[Method Options Begin]\n${(tools || []).join(', ')}\n[Method Options End]`,
        ]),
        extraInstructions: CONFIGURE_INSTRUCTIONS,
        parentId: this.id,
      });
      const result = await pc.execute();
      this.addSequencePlan(pc);
      this.logger.debug('Configure result: ', result);
      const { configure, error: configureError }: oPlanResult = result;
      if (configureError) {
        return {
          error: configureError,
          type: 'error',
        };
      }
      if (!configure || !configure.task) {
        throw new oToolError(
          oToolErrorCodes.TOOL_ERROR,
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

  async postflight(result: oPlanResult): Promise<oPlanResult> {
    // if the response is larger than 10,000 characters, then put it in an address
    const THRESHOLD_DATA_SIZE = 1_000;
    if (
      this.config?.receiver &&
      this.config.receiver.toString().indexOf('placeholder') === -1 &&
      JSON.stringify(result).length > THRESHOLD_DATA_SIZE
    ) {
      let data = result.result;
      data = await ObjectUtils.allKeyValues(data, async (key, val) => {
        const value = val;
        if (
          value &&
          typeof value === 'string' &&
          value.length > THRESHOLD_DATA_SIZE
        ) {
          const addressKey = uuidv4();
          this.logger.debug('Storing large data in address: ', value);
          const largeDataResponse = await this.node.use(
            new oAddress('o://placeholder'),
            {
              method: 'put',
              params: {
                key: addressKey,
                value: value,
                intent: this.config.intent,
              },
            },
          );
          const { instructions } = largeDataResponse.result.data as any;
          return instructions;
        }
      });
      // update the response data
      result.result = data;
    }
    this.result = result;
    await super.postflight(result);
    return result;
  }
}
