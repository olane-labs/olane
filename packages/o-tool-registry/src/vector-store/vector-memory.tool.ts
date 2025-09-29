import { ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { VECTOR_STORE_PARAMS } from './methods/vector-store.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export abstract class VectorMemoryStorageTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://vector-store'),
      methods: VECTOR_STORE_PARAMS,
      description: 'Vector store tool for storing and searching documents',
    });
  }

  abstract _tool_search_similar(request: oRequest): Promise<ToolResult>;
  abstract _tool_add_documents(request: oRequest): Promise<ToolResult>;
  abstract _tool_delete_documents(request: oRequest): Promise<ToolResult>;
  abstract _tool_update_documents(request: oRequest): Promise<ToolResult>;
}
