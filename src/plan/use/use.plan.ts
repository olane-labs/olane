import { oAddress, oDependency, oResponse } from '../../core/index.js';
import { oPlan } from '../o-plan.js';
import { oPlanType } from '../interfaces/plan-type.enum.js';
import { oPlanResult } from '../interfaces/plan.result.js';
import { oToolError } from '../../error/tool.error.js';
import { oToolErrorCodes } from '../../error/enums/codes.error.js';

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

  async run(): Promise<oPlanResult> {
    this.logger.debug('Running...');
    if (!this.config.receiver) {
      throw new Error('Receiver is required');
    }

    try {
      // do handshake to get the method + parameters + dependencies
      const handshakeResponse = await this.node.use(this.config.receiver, {
        method: 'handshake',
        params: {
          intent: this.config.intent,
          // sequence: this.sequence.map((s) => {
          //   return {
          //     config: s.toCIDInput(),
          //     result: s.result,
          //   };
          // }),
        },
      });

      this.logger.debug('Handshake response: ', handshakeResponse);
      const data = handshakeResponse.result.data as any;
      this.logger.debug('Handshake data: ', data);
      const { handshake, error }: any = data;
      if (error) {
        return error;
      }
      if (!handshake) {
        throw new oToolError(
          oToolErrorCodes.TOOL_ERROR,
          'Failed to configure the tool use',
        );
      }
      const response = await this.node.use(this.config.receiver, {
        method: handshake.payload?.method,
        params: handshake.payload?.params,
      });

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
