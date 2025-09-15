import { oAddress } from '../../core/o-address.js';
import { oPlanConfig } from '../interfaces/plan-config.interface.js';
import { oPlanType } from '../interfaces/plan-type.enum.js';
import { oPlanResult } from '../interfaces/plan.result.js';
import { oPlan } from '../o-plan.js';

export class oErrorPlan extends oPlan {
  constructor(config: oPlanConfig) {
    super(config);
    // this.config.promptFunction = CONFIGURE_PROMPT;
  }

  type() {
    return oPlanType.ERROR;
  }
}
