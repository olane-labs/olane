import { oPlan } from '../o-plan.js';
import { oPlanType } from '../interfaces/plan-type.enum.js';
import { oPlanConfig } from '../interfaces/plan-config.interface.js';
import { CONFIGURE_PROMPT } from '../prompts/configure.prompt.js';

/**
 * We know what tool we want to use, let's configure it.
 */
export class oConfigurePlan extends oPlan {
  constructor(config: oPlanConfig) {
    super(config);
    this.config.promptFunction = CONFIGURE_PROMPT;
  }

  type() {
    return oPlanType.CONFIGURE;
  }
}
