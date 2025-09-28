import { oToolConfig } from '@olane/o-tool';
import { oAddress, oRequest, RegexUtils } from '@olane/o-core';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { PlaceholderPutRequest } from './interfaces/placeholder-put.request.js';
import { PlaceholderPutResponse } from './interfaces/placeholder-put.response.js';
import { PLACEHOLDER_STORAGE_PARAMS } from './methods/placeholder-storage.methods.js';

export class PlaceholderTool extends MemoryStorageProvider {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://placeholder'),
      methods: PLACEHOLDER_STORAGE_PARAMS,
    });
  }

  async myTools(): Promise<string[]> {
    const tools = await super.myTools(MemoryStorageProvider.prototype);
    return tools;
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
    this.logger.debug('Summarizing document for intent: ', intent);
    // set a max length for value consideration
    const response = await this.use(new oAddress('o://intelligence'), {
      method: 'prompt',
      params: {
        prompt: `
        You are a helpful assistant that summarizes documents as they relate to the user's intent.
        Format the output in JSON using this template:
        {
          "summary": "string",
        }
        Rules:
        1. Do NOT include any other text other than the JSON response.
        2. If the intent is empty, simply summarize the document.
        3. The output should be concise and to the point.
        4. The summary value should use the Document Summarization Rules to summarize the document.

        Document Summarization Rules:
        1. Extract the key points about the document.
        2. Filter the key points to only include information that is relevant to the user's intent.
        3. Include mentions of any file names or paths that are relevant to the user's intent in the summary.
        4. The first sentence should mention the type of document that you are summarizing.
        5. If the user's intent does not need to know anything about the document, return a very short summary.

        The intent is ${intent || 'empty'}.
        The document is ${value.substring(0, 50_000)}.
        `,
      },
    });
    const data = response.result.data as any;
    this.logger.debug('Placeholder AI put response: ', data);
    const { summary } = RegexUtils.extractResultFromAI(data.message);
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
      instructions: `To save on context window size, I have summarized the document and the contents are available at this address: "${this.address.toString()}/${key}". This address represents the original value and it will be automatically translated before it gets to the tool. DO NOT "get" the contents of this address unless absolutely necessary. \n\nThe summary for this document is: ${summary}.`,
      address: `${this.address.toString()}/${key}`,
    };
  }
}
