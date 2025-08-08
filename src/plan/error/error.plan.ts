import { oAddress } from '../../core';
import { oPlanConfig } from '../interfaces/plan-config.interface';
import { oPlanResult } from '../interfaces/plan.result';
import { oPlan } from '../o-plan';
import { ERROR_PROMPT } from '../prompts/error.prompt';

export class oErrorPlan extends oPlan {
  private error: any;
  constructor(config: oPlanConfig & { error: any }) {
    super(config);
    this.error = config.error;
  }

  async run(): Promise<oPlanResult> {
    const prompt = ERROR_PROMPT(this.error, this.agentHistory);
    this.logger.debug('Error prompt: ', prompt);

    const response = await this.node.use(new oAddress('o://intelligence'), {
      method: 'prompt',
      params: {
        prompt: prompt,
      },
    });

    return response.result.data as oPlanResult;
  }
}
