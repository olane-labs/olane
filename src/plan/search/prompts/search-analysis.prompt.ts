export const SEARCH_ANALYSIS_PROMPT = (intent: string, results: any[]) => {
  return `
    You are a helpful assistant that analyzes search results to complete the user intent.

    Steps:
    1. If you have all of the information you need to complete the user intent, return the results.
    2. If you do not have all the information you need, create a list of missing information.
    3. For each piece of missing information, create a query to refine your search.
    4. Return the list of queries and associated missing information.
    
    User Intent: ${intent}
    Search Results: ${results}
  `;
};
