import { oAddress } from '../../core';
import { oPlanConfig } from '../interfaces/plan-config.interface';
import { oPlanResult } from '../interfaces/plan.result';
import { oPlan } from '../o-plan';

export class oSearchPlan extends oPlan {
  private query: string;
  constructor(config: oPlanConfig & { query: string }) {
    super(config);
    this.query = config.query;
  }

  async run(): Promise<oPlanResult> {
    const response = await this.node.use(new oAddress('o://search'), {
      method: 'vector',
      params: {
        query: this.query,
      },
    });

    // if no results, perhaps we should check other networks we know about
    // TODO: check other networks we know about (i.e internet 1.0, sonar, trusted other nets)
    // additionalContext[query] = response.result.data;

    return {
      result: response.result.data,
      type: 'result',
    };
  }
}
