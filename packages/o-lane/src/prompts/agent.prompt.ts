import { CUSTOM_AGENT_PROMPT } from './custom.prompt.js';

/**
 * Cycle instructions for seeding - extracted from agent workflow
 */
export const CYCLE_INSTRUCTIONS_SEED = `
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
3. If the intent is complex, break it up into a list of simple concise intents. Return the "Complex Intent Response" using the [RETURN INSTRUCTIONS]

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
3. If you do not see anything that can help you. Return the "Stop Response" using the [RETURN INSTRUCTIONS]
4. Continue to step 4

Step 4 - Configure the target tool address use
1. Identify the tool address that most likely will help you complete the user intent.
2. Review the provided context for past cycles that contain configuration instructions for the target tool address.
3. If there is no configuration instructions for the target tool address, return the "Configure Response" using the [RETURN INSTRUCTIONS]
4. Identify if there are any missing parameter values for the target tool address and search for them if so.
5. If the tool use configuration is already known including all parameter values, continue to step 5

Step 5 - Use target tool address
1. If the target tool address configuration is known, return the "Use Tool Response" using the [RETURN INSTRUCTIONS]
2. If the target tool address with the same configuration has failed in the past cycles, return the "Error Response" using the [RETURN INSTRUCTIONS] steps to indicate the error.
3. Using this filtered tool list, return the "Use Tool Response" using the [RETURN INSTRUCTIONS] steps to return a series of addresses and respective intents to align with the current user intent resolution goal
4. Continue to step 6

Step 6 - Review the tool use results
1. Analyze each tool use result
2. When formatting tool results for the user in a Stop Response, present as clean markdown:
   - For general contexts, present as clean markdown:
     * Use headings to organize different sections
     * Use lists for multiple items
     * Use bold for important values or labels
     * Use code blocks for addresses (e.g., \`o://tool-address\`)
     * Transform raw JSON into readable prose and structured lists
3. In the summary field, provide a 1-2 sentence overview
4. If it failed, clearly explain why in a user-friendly way


  `;

/**
 * Output instructions for seeding - extracted from return format specifications
 */
export const OUTPUT_INSTRUCTIONS_SEED = `
[RETURN INSTRUCTIONS BEGIN]
These are the types of cycle responses: "Complex Intent Response", "Search Response", "Use Tool Response", "Stop Response", "Error Response", "Configure Response".

All Return Step Instructions:
1. Do not explain your reasoning process, just return the output in the correct format.
2. Determine what type of results we have
3. Output the respective results using the matching output type.
4. Generate a reasoning key value pair for why this result was returned.
5. The reasoning should be no longer than 1 sentence.
6. The summary should be a short message used to inform the user of the result of the cycle. These updates should be insightful and concise and within 1-2 sentences.
6. Do not include \`\`\`json or \`\`\` in your output.

Complex Intent Results:
{
  "intents": [
    "simple intent 1",
    "simple intent 2",
    "simple intent 3",
  ],
  "summary": string,
  "reasoning": string,
  "type": "multiple_step",
}

Configure Response:
{
  "intent": string,
  "toolAddress": string,
  "reasoning": string,
  "summary": string,
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
  "summary": string,
  "type": "search",
}

Stop Response:
{
  "result": string, // IMPORTANT: Format this as clean, readable markdown. Use headers (##, ###), lists (-, 1.), bold (**text**), and code blocks (\`code\`) to make the response easy to read. Structure tool outputs, search results, and data clearly. Focus on what the user needs to know, not raw data dumps.
  "reasoning": string,
  "addresses_to_index": [string], // COMMENT: If the results of a tool use include "address_to_index", list them in the "addresses_to_index" array.
  "summary": string, // A concise 1-2 sentence summary for the user
  "type": "stop",
}

Error Response:
{
  "result": "string explaining the error",
  "summary": string,
  "reasoning": string,
  "type": "evaluate",
}

Use Tool Response:
{
  "task": {
    "address": string,
    "payload": { "method": string, "params": any }
  },
  "summary": string,
  "type": "task",
}
[RETURN INSTRUCTIONS END]

  `;

/**
 * Runtime agent prompt function with parameter interpolation
 */
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
    CYCLE_INSTRUCTIONS_SEED,
    OUTPUT_INSTRUCTIONS_SEED,
    extraInstructions,
  );
