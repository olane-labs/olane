import { oToolConfig } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { SEARCH_PARAMS } from './parameters/search.parameters.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export class SearchTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://search'),
      methods: SEARCH_PARAMS,
      description: 'Tool to search for any information in the network',
    });
  }

  async _tool_vector(request: oRequest): Promise<ToolResult> {
    const { query } = request.params as any;
    // let's search our available providers to resolve the task
    // first search local providers
    this.logger.debug('Searching network with terms: ', query);
    // TODO: how can we improve this?
    const response = await this.use(new oAddress('o://vector-store'), {
      method: 'search_similar',
      params: {
        query: query,
        limit: 10,
      },
    });
    return response.result.data as any;
  }

  async index() {
    return {
      summary: 'Search tool',
    };
  }
}
