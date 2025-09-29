import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { NLP_PARAMS } from './methods/nlp.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export class NERTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://ner'),
      methods: NLP_PARAMS,
      description: 'Tool to extract named entities from text',
    });
  }

  async _tool_extract(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { text } = params;

    this.logger.debug('Extracting entities from text', text);
    const response = await this.use(new oAddress('o://intelligence'), {
      method: 'prompt',
      params: {
        prompt: `Extract named entities and their metadata from the following text: ${text}`,
      },
    });
    return response.result;
  }
}
