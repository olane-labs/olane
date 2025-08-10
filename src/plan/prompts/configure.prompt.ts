import { CUSTOM_AGENT_PROMPT } from './custom.prompt';

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

Step 1 - Evaluate the intent
1. A complex step means there are multiple actions required to complete the user's intent
2. If the intent is not-complex, continue to step 2
3. If the intent is complex, break it up into a list of simple concise intents. Stop here and follow the "Return Instructions" steps

Step 2 - Handshake
1. If this is not a handshake request, continue to step 3
2. Method options are listed in the [Method Options Begin] section.
3. Method metadata context is listed in the [Method Metadata Begin] section.
4. Review the method information and select the best method to resolve the user's intent.
5. If you have enough information to complete the handshake, follow the "Return Instructions" steps to return the "handshake results" do not return "Use Tool Results".
6. Continue to step 3

  `,
    `
These are the types of cycle results: "Answer Results", "Handshake Results", "Error Results".

All Return Step Instructions:
1. Determine what type of results we have
2. Output the respective results using the matching output type.
3. Generate a reasoning statement for why this result was returned.
4. Do not include \`\`\`json or \`\`\` in your output.

Handshake Results:
{
  "handshake": {
    "address": string,
    "payload": { "method": string, "params": any }
  },
  "type": "handshake",
}

Answer Results:
{
  "result": string,
  "reasoning": string,
  "type": "result",
}

Error Results:
{
  "error": string,
  "reasoning": string,
  "type": "error",
}

    `,
  );
