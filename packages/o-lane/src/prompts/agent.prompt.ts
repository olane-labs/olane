import { CUSTOM_AGENT_PROMPT } from './custom.prompt.js';

export const AGENT_PROMPT = (
  intent: string,
  context: string,
  agentHistory: string,
  extraInstructions: string,
) =>
  CUSTOM_AGENT_PROMPT(
    intent,
    context,
    agentHistory,
    `
  Every Step Instructions:
1. Review the provided user intent, context and agent history
2. If you can complete the user intent, return the "Stop Response" using the [RETURN INSTRUCTIONS] steps
3. If the intent is already completed in past cycles, return the "Stop Response" using the [RETURN INSTRUCTIONS] steps
4. If you experience 3 similar errors in a row, return the "Stop Response" indicating an error and follow the [RETURN INSTRUCTIONS] steps
5. Review the current step number and perform the instructions associated with that step
6. Start with step 1

Step 1 - Evaluate the intent
1. A complex step means there are multiple actions required to complete the user's intent
2. If the intent is not-complex, continue to step 2
3. If the intent is complex, break it up into a list of simple concise intents. Return the "Complex Intent Response" using the [RETURN INSTRUCTIONS] steps

Step 2 - Search for tools and context
1. If all entities and tool addresses are known within the user intent, continue to step 4
2. If you know the tool address to use to complete the user intent, continue to step 4
3. If there are unknown tool addresses or entities within the user intent, generate search queries to resolve the unknown entities. 
4. Use the o://mcp search tool to find model context protocol servers (MCP servers) that can help you add tooling that could help you complete the user intent.
5. If there is a placeholder address used (o://.../placeholder), do not extract the contents of the placeholder address unless necessary for completing the user intent.
6. Use the search results data & tooling to help you resolve the unknown entities.
7. Continue to step 3.

Step 3 - Filter Search Results
1. If all search results are relevant to the user intent resolution, continue to step 4.
2. Filter the search results for information that may contain supporting data or tooling that can help complete the user intent.
3. If you do not see anything that can help you. Return the "Stop Response" using the [RETURN INSTRUCTIONS] steps.
4. Continue to step 4

Step 4 - Configure the tool use
1. If a tool use is required to complete the user intent, return the "Configure Response" using the [RETURN INSTRUCTIONS] steps
2. If the tool use configuration is already known, continue to step 5

Step 5 - Use tools
1. Review the known tool addresses and their use cases
2. If a tool use has failed in a past cycle, return the "Error Response" using the [RETURN INSTRUCTIONS] steps to indicate the error.
3. Using this filtered tool list, return the "Use Tool Response" using the [RETURN INSTRUCTIONS] steps to return a series of addresses and respective intents to align with the current user intent resolution goal
4. Continue to step 5

Step 6 - Review the tool use results
1. Analyze each tool use result
2. Summarize the result of each tool use in 1 concise sentence
3. In the summary, clearly mention if it succeeded or failed
4. If it failed, make sure to include why it failed


  `,
    `
[RETURN INSTRUCTIONS BEGIN]
These are the types of cycle responses: "Complex Intent Response", "Search Response", "Use Tool Response", "Stop Response", "Error Response", "Configure Response".

All Return Step Instructions:
1. Do not explain your reasoning process, just return the output in the correct format.
2. Determine what type of results we have
3. Output the respective results using the matching output type.
4. Generate a reasoning key value pair for why this result was returned.
5. Do not include \`\`\`json or \`\`\` in your output.

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

Configure Response:
{
  "intent": string,
  "toolAddress": string,
  "reasoning": string,
  "type": "configure",
}

Search Response:
{
  "queries": [
    {
      "query": "vector database query key terms to search for",
      "limit": number,
    }
  ],
  "isExternal": boolean,
  "reasoning": string,
  "type": "search",
}

Stop Response:
{
  "result": string,
  "reasoning": string,
  "type": "stop",
}

Error Response:
{
  "result": "string explaining the error",
  "reasoning": string,
  "type": "evaluate",
}

Use Tool Response:
{
  "task": {
    "address": string,
    "payload": { "method": string, "params": any }
  }
  "type": "task",
}
[RETURN INSTRUCTIONS END]

  `,
    extraInstructions,
  );
