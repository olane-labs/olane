import { oAddress } from '../../core/o-address.js';
import { oPlanConfig } from '../interfaces/plan-config.interface.js';
import { oPlanResult } from '../interfaces/plan.result.js';
import { oPlan } from '../o-plan.js';
import { ERROR_PROMPT } from '../prompts/error.prompt.js';

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
