import { oObject } from "@olane/o-core";
import Handlebars from "handlebars";
import { oPromptConfig } from "./interfaces/o-prompt.config.js";
import { oCapabilityType } from "../capabilities/index.js";

export class oPrompt extends oObject {
  private readonly rawValue: string;
  private readonly type: oCapabilityType;
  private readonly provider: string;
  private readonly params: any;
  private compiledTemplate?: HandlebarsTemplateDelegate;

  constructor(config: oPromptConfig) {
    super();

    if (!config.rawValue) {
      throw new Error('rawValue is required in oPromptConfig');
    }

    this.rawValue = config.rawValue;
    this.type = config.type;
    this.provider = config.provider;
    this.params = config.params || {};
  }

  /**
   * Extracts all template variables from the rawValue template
   * @returns Array of variable names found in the template
   */
  getRequiredVariables(): string[] {
    // Match handlebars variables: {{variable}} or {{object.property}}
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = this.rawValue.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      // Extract the variable name (before any dots for nested properties)
      const fullPath = match[1].trim();
      const rootVariable = fullPath.split('.')[0];
      variables.add(rootVariable);
    }

    return Array.from(variables);
  }

  /**
   * Validates that all required template variables are present in params
   * @throws Error if any required variables are missing
   */
  validate(): void {
    const requiredVariables = this.getRequiredVariables();
    const providedKeys = Object.keys(this.params);
    const missingVariables = requiredVariables.filter(
      (variable) => !providedKeys.includes(variable)
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required template variables: ${missingVariables.join(', ')}. ` +
        `Required: [${requiredVariables.join(', ')}], ` +
        `Provided: [${providedKeys.join(', ')}]`
      );
    }
  }

  /**
   * Compiles the template with provided params
   * @returns The compiled template string
   * @throws Error if template variables are missing or compilation fails
   */
  compile(): string {
    // Validate first to provide clear error messages
    this.validate();

    try {
      // Compile template if not already compiled
      if (!this.compiledTemplate) {
        this.compiledTemplate = Handlebars.compile(this.rawValue, {
          strict: true,
          noEscape: true, // Don't HTML-escape variables
        });
      }

      // Render the template with params
      const result = this.compiledTemplate(this.params);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to compile template: ${error.message}. ` +
          `Template type: ${this.type}, Provider: ${this.provider}`
        );
      }
      throw error;
    }
  }

  /**
   * Alias for compile() for clearer semantics
   */
  render(): string {
    return this.compile();
  }

  // Getters for config properties
  getRawValue(): string {
    return this.rawValue;
  }

  getType(): oCapabilityType {
    return this.type;
  }

  getProvider(): string {
    return this.provider;
  }

  getParams(): any {
    return this.params;
  }
}
