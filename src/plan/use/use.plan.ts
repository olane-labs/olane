import { oAddress, oDependency, oResponse } from '../../core';
import { oPlan } from '../o-plan';
import { oPlanType } from '../interfaces/plan-type.enum';
import { oPlanResult } from '../interfaces/plan.result';
import { oToolError } from '../../error';
import { oToolErrorCodes } from '../../error/enums/codes.error';

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

    const data: any = handshakeResponse.result.data;
    this.logger.debug('Handshake response: ', data);
    if (data.error) {
      return data;
    }
    if (!data.payload) {
      throw new oToolError(
        oToolErrorCodes.TOOL_ERROR,
        'Failed to configure the tool use',
      );
    }
    const response = await this.node.use(this.config.receiver, {
      method: data.payload?.method,
      params: data.payload?.params,
    });
    this.logger.debug('Use response: ', response);
    // check for error
    if (response.result.error) {
      return {
        error: {
          ...response.result.error,
          methodMetadata: data.methodMetadata,
          methods: data.methods,
        },
        type: 'error',
      };
    }

    return {
      result: response.result,
      type: 'result',
    };
  }
}
