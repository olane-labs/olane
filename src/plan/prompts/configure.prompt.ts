import { CUSTOM_AGENT_PROMPT } from './custom.prompt.js';

export const CONFIGURE_PROMPT = (
  intent: string,
  context: string,
  agentHistory: string,
) =>
  CUSTOM_AGENT_PROMPT(
    intent,
    context,
    agentHistory,
    `
  Every Step Instructions:
1. Review the provided user intent and context
2. If you can complete the user intent, return the answer using the "Return Instructions" steps
3. If you experience an error trying to use a tool more than 2 times, stop here and follow the "Return Instructions" steps to indicate the error.
3. Review the current step number and perform the instructions associated with that step.
4. Start with step 1

Step 1 - Validate the intent
1. If the intent is not a configure request, continue to step 5
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
1. If this is not a configure request, return an error.
2. If you are missing parameter values, generate the intents for the "Complex Intent" results using other methods or search to help.
2. If you have enough information to complete the configure request, follow the "Return Instructions" steps to return the "configure results".
3. If you do not have enough information to complete the configure request, return an error.

  `,
    `
These are the types of cycle results: "Complex Intent Results", "Configure Results", "Error Results", "Search Results".

All Return Step Instructions:
1. Determine what type of results we have
2. Output the respective results using the matching output type.
3. Generate a reasoning statement for why this result was returned.
4. Do not include \`\`\`json or \`\`\` in your output.

Complex Intent Results:
{
  "intents": [
    "simple intent 1",
    "simple intent 2",
    "simple intent 3",
  ],
  "reasoning": string,
  "type": "multiple_step",
}

Configure Results:
{
  "configure": {
    "task": {
      "address": string,
      "payload": { "method": string, "params": any }
    }
  },
  "type": "configure",
}

Search Results:
{
  "queries": [
    {
      "query": "key terms to search for",
      "provider": "internal" | "external",
    }
  ],
  "reasoning": string,
  "type": "search",
}


Error Results:
{
  "error": string,
  "reasoning": string,
  "type": "error",
}

    `,
  );
