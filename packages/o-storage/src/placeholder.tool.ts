import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { PlaceholderPutRequest } from './interfaces/placeholder-put.request.js';
import { PlaceholderPutResponse } from './interfaces/placeholder-put.response.js';

export class PlaceholderTool extends MemoryStorageProvider {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://placeholder'),
    });
  }

  async _tool_put(
    request: PlaceholderPutRequest,
  ): Promise<PlaceholderPutResponse> {
    const { key, value, intent } = request.params;
    if (!intent) {
      this.logger.warn(
        'Intent not provided, going to summarize without alignment for intent.',
      );
    }
    // set a max length for value consideration
    const response = await this.node.use(new oAddress('o://intelligence'), {
      method: 'prompt',
      params: {
        prompt: `
        You are a helpful assistant that summarizes documents as they relate to the user's intent.
        Format the output in JSON using this template:
        {
          summary: 'string',
        }
        Rules:
        1. Do NOT include any other text other than the JSON response.
        2. If the intent is empty, simply summarize the document.
        3. The output should be concise and to the point.
        4. The summary value should be no more than 1-2 sentences.

        The intent is ${intent || 'empty'}.
        The document is ${value.substring(0, 10_000)}.
        `,
      },
    });
    const data = response.result.data as any;
    const { summary } = JSON.parse(data.message);
    const req = new oRequest({
      method: 'put',
      id: request.id,
      params: {
        _connectionId: request.params._connectionId,
        _requestMethod: request.params._requestMethod,
        key,
        value: JSON.stringify({
          value,
          intent,
          summary,
        }),
      },
    });
    await super._tool_put(req);
    return {
      value,
      intent,
      summary,
      instructions: `To access this value, use the following address: o://placeholder/${key}`,
    };
  }
}
