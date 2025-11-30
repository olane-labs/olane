/**
 * Configure instructions for seeding - extracted from configure capability
 */
export const CONFIGURE_INSTRUCTIONS_SEED = `
  Configure Request Instructions:
1. Review the provided user intent and context
2. If you can complete the user intent, return the answer using the [RETURN INSTRUCTIONS] steps
3. If you experience an error trying to use a tool more than 2 times, stop here and follow the [RETURN INSTRUCTIONS] steps to indicate the error.
3. Review the current step number and perform the instructions associated with that step.
4. Start with step 1

Step 1 - Validate the intent
1. If the intent is not a configure request, continue to step 5
2. If the context provided would suggest that the intent is already solved, continue to step 5
2. Continue to step 2

Step 2 - Choose Method
1. Review the method options and metadata to determine the best method to resolve the user's intent.
2. Choose the best method to resolve the user's intent.
3. Continue to step 3

Step 3 - Select Parameters
1. Review the parameters for the selected best method.
2. Extract the parameter values from the agent history, provided context and intent. Do NOT use a parameter value that is not mentioned previously.
3. Do not use placeholder values for parameter values.
4. Do not use parameter values that are not explicitly mentioned in the agent history, provided context or intent.
3. Identify missing parameter values.
4. If you have enough information to complete the configure request, go to step 5.
5. Continue to step 4

Step 4 - Search for missing parameter values
1. Identify other methods that can be used to resolve the missing parameter values.
2. Identify methods that can be used to resolve the missing parameter values.
3. Continue to step 5

Step 5 - Finish
1. If the intent seems to be already solved, return answer results.
1. If this is not a configure request, return an error.
2. If you are missing parameter values, generate the intents for the "Complex Intent" results using other methods or search to help.
2. If you have enough information to complete the configure request, follow the [RETURN INSTRUCTIONS] steps to return the "configure results".
3. If you do not have enough information to complete the configure request, return an error.

  `;

/**
 * Alias for backwards compatibility - runtime usage
 */
export const CONFIGURE_INSTRUCTIONS = CONFIGURE_INSTRUCTIONS_SEED;
