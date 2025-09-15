// import { CUSTOM_AGENT_PROMPT } from './custom.prompt';

// export const ERROR_PROMPT = (
//   intent: string,
//   context: string,
//   agentHistory: string,
// ) =>
//   CUSTOM_AGENT_PROMPT(
//     intent,
//     context,
//     agentHistory,
//     `

// Error: ${JSON.stringify(error, null, 2)}

// Rules:
// 1. Do not explain the reasoning process, just return the output.
// 2. Do not include \`\`\`json or \`\`\` in your output.

// Steps:
// 1. Review the error and determine the cause.
// 2. Check the agentic state history to see if there was a better choice that could have been made to prevent this error.
// 3. Review the method options to see if there was a better method that could have been used to prevent this error.
// 4. Review the method metadata to see if the error is due to a missing method or parameter.
// 5. If you can fix the error, provide a solution.
// 6. If you cannot fix the error, create a human readable explanation on how to solve the error.
// 5. The explanation should summarize the intent and explain why it failed concisely.

// Error Output Format:
// {
//   "error": {
//     "message": string,
//     "solution": string,
//     "explanation": string,
//   },
//   "type": "error",
// }

// [Agentic State]
// ${agentHistory}
// `,
//     `These are the types of cycle results: "Complex Intent Results", "Search Results", "Use Tool Results", "Answer Results", "Error Results".

// All Return Step Instructions:
// 1. Determine what type of results we have
// 2. Output the respective results using the matching output type.
// 3. Generate a reasoning statement for why this result was returned.
// 4. Do not include \`\`\`json or \`\`\` in your output.

// Complex Intent Results:
// {
//   "intents": [
//     "simple intent 1",
//     "simple intent 2",
//     "simple intent 3",
//   ],
//   "reasoning": string,
//   "type": "multiple_step",
// }

// Use Tool Results:
// {
//   "tasks": [
//     {
//       "address": "string",
//       "intent": "string",
//     },
//   ],
//   "reasoning": string,
//   "type": "task",
// }

// Search Results:
// {
//   "queries": [
//     {
//       "query": "key terms to search for",
//       "provider": "internal" | "external",
//     }
//   ],
//   "reasoning": string,
//   "type": "search",
// }

// Answer Results:
// {
//   "result": string,
//   "reasoning": string,
//   "type": "result",
// }

// Error Results:
// {
//   "error": string,
//   "reasoning": string,
//   "type": "error",
// }`,
//   );
