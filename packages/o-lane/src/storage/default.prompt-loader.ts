import { oCapabilityType } from "../capabilities/enums/o-capability.type-enum.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agent.prompt.js";
import { CONFIGURE_PROMPT_TEMPLATE } from "../prompts/configure.prompt.js";
import { PromptLoader } from "./prompt-loader.js";

export class PromptLoaderDefault extends PromptLoader {

  async loadTemplateForType(type: oCapabilityType): Promise<string> {
    if (type === oCapabilityType.CONFIGURE) {
      return CONFIGURE_PROMPT_TEMPLATE;
    } else if (type === oCapabilityType.EVALUATE) {
      return Promise.resolve(AGENT_PROMPT_TEMPLATE);
    }
    throw new Error('Unsupported template');
  }
}