import { oAddress, oDependency, oResponse } from '../../core/index.js';
import { oPlan } from '../o-plan.js';
import { oPlanType } from '../interfaces/plan-type.enum.js';
import { oPlanResult } from '../interfaces/plan.result.js';
import { oToolError } from '../../error/tool.error.js';
import { oToolErrorCodes } from '../../error/enums/codes.error.js';
import { oConfigurePlan } from '../configure/configure.plan.js';
import { oPlanContext } from '../plan.context.js';
import { oHandshakeResult } from '../interfaces/handshake.result.js';
import { oAgentPlan } from '../agent.plan.js';
import { CONFIGURE_PROMPT } from '../prompts/configure.prompt.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * We know what tool we want to use, let's use it.
 */
export class oUsePlan extends oPlan {
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
        promptFunction: CONFIGURE_PROMPT,
        sequence: this.sequence,
        intent: `This is a configure request. You have already found the tool to resolve the user's intent: ${this.config.receiver}. Configure the request to use the tool with user intent: ${this.config.intent}`,
        context: new oPlanContext([
          `[Method Metadata Begin]\n${JSON.stringify(methods, null, 2)}\n[Method Metadata End]`,
          `[Method Options Begin]\n${tools.join(', ')}\n[Method Options End]`,
        ]),
      });
      const result = await pc.execute();
      this.sequence.push(pc);
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
      const params = task.payload?.params;
      for (const key in params) {
        let value = params[key];
        if (oUsePlan.hasOlaneAddress(value)) {
          console.log('Has olane address: ', value);
          const addresses = oUsePlan.extractAddresses(value);
          for (const address of addresses) {
            console.log('Extracted address: ', address);
            const largeDataResponse = await this.node.use(
              new oAddress('o://leader/storage/placeholder'),
              {
                method: 'get',
                params: {},
              },
            );
            console.log('Large data response: ', largeDataResponse);
            value = value.replace(
              address,
              (largeDataResponse.result.data as any)?.value || 'unknown value',
            );
          }
          params[key] = value;
        }
      }
      const response = await this.node.use(this.config.receiver, {
        method: task.payload?.method,
        params: params,
      });

      // if the response is larger than 10,000 characters, then put it in an address
      const THRESHOLD_DATA_SIZE = 10_000;
      if (
        response.result.data &&
        JSON.stringify(response.result.data).length > THRESHOLD_DATA_SIZE
      ) {
        const data = response.result.data as any;
        for (const key in data) {
          const value = data[key];
          if (
            value &&
            typeof value === 'string' &&
            value.length > THRESHOLD_DATA_SIZE
          ) {
            const addressKey = uuidv4();
            data[key] = `o://leader/storage/placeholder/${addressKey}`;
            this.logger.debug('Storing large data in address: ', data[key]);
            await this.node.use(
              new oAddress('o://leader/storage/placeholder'),
              {
                method: 'put',
                params: {
                  key: addressKey,
                  value: value,
                },
              },
            );
          }
        }
        // update the response data
        response.result.data = data;
      }

      return {
        result: response.result,
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
