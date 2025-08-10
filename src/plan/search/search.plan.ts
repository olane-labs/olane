import { oAddress } from '../../core';
import { oPlanConfig } from '../interfaces/plan-config.interface';
import { oPlanResult } from '../interfaces/plan.result';
import { oPlan } from '../o-plan';

export class oSearchPlan extends oPlan {
  private query: string;
  private external: boolean;
  constructor(config: oPlanConfig & { query: string; external: boolean }) {
    super(config);
    this.query = config.query;
    this.external = config.external;
  }

  /**
   * Search external providers.
   */
  private async externalSearch(): Promise<oPlanResult> {
    return {
      result: [],
      type: 'result',
    };
    // const response = await this.node.use(new oAddress('o://search'), {
    //   method: 'vector',
    //   params: {
    //     query: this.query,
    //   },
    // });
    // return response.result.data;
  }

  /**
   * Search internal providers such as the local vector store, local database, etc.
   */
  private async internalSearch(): Promise<oPlanResult> {
    const response = await this.node.use(new oAddress('o://search'), {
      method: 'vector',
      params: {
        query: this.query,
      },
    });
    return {
      result: response.result.data,
      type: 'result',
    };
  }

  async run(): Promise<oPlanResult> {
    const result = this.external
      ? await this.externalSearch()
      : await this.internalSearch();

    return result;
  }
}
