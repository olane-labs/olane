import { CUSTOM_AGENT_PROMPT } from './custom.prompt.js';

export const AGENT_PROMPT = (
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

Step 2 - Search for tools and context
1. If all entities and tool addresses are known within the user intent, continue to step 3
2. Review the user's intent, the current node's functionality, rules and context
3. If there are unknown tool addresses or entities within the user intent, generate search queries to resolve the unknown entities. 
4. Search queries can be internal or external. If they are internal, they should be vector database queries. If they are external, they should be concise queries to internet search providers. Stop here and follow the "Return Instructions" steps

Step 3 - Filter Search Results
1. If all search results are relevant to the user intent resolution, continue to step 4.
2. Filter the search results for information that may contain supporting data or tooling that can help complete the user intent.
3. If you do not see anything that can help you. Generate empty search results. stop here and follow the "Return Instructions" steps.

Step 4 - Use tools
1. Review the discovered tools and their addresses
2. If a tool use has failed in a past cycle, stop here and follow the "Return Instructions" steps to indicate the error.
3. Using this filtered tool list, follow "Return Instructions" steps to return a series of addresses and respective intents to align with the current user intent resolution goal

Step 5 - Review the tool use results
1. Analyze each tool use result
2. Summarize the result of each tool use in 1 concise sentence
3. In the summary, clearly mention if it succeeded or failed
4. If it failed, make sure to include why it failed
  `,
    `
  These are the types of cycle results: "Complex Intent Results", "Search Results", "Use Tool Results", "Answer Results", "Error Results".

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

Use Tool Results:
{
  "tasks": [
    {
      "address": "string",
      "intent": "string",
    },
  ],
  "reasoning": string,
  "type": "task",
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
