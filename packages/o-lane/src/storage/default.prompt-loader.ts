import { oCapabilityType } from "../capabilities/enums/o-capability.type-enum.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agent.prompt.js";
import { CONFIGURE_PROMPT_TEMPLATE } from "../prompts/configure.prompt.js";
import { PromptLoader } from "./prompt-loader.js";
import { oPrompt } from "../prompts/o-prompt.js";

export class PromptLoaderDefault extends PromptLoader {

  /**
   * Load a prompt for the given capability type
   * @param type The capability type
   * @param params Parameters to populate the template
   * @param provider Provider identifier (defaults to 'default')
   * @returns oPrompt instance
   */
  async loadPromptForType(
    type: oCapabilityType,
    params: any = {},
    provider: string = 'default'
  ): Promise<oPrompt> {
    // Get the raw template
    let rawValue: string;

    if (type === oCapabilityType.CONFIGURE) {
      rawValue = CONFIGURE_PROMPT_TEMPLATE;
    } else if (type === oCapabilityType.EVALUATE) {
      rawValue = AGENT_PROMPT_TEMPLATE;
    } else {
      throw new Error(`Unsupported template type: ${type}`);
    }

    // Create and return oPrompt instance
    return new oPrompt({
      rawValue,
      type,
      provider,
      params,
    });
  }

}
