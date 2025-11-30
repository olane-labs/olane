import { ToolResult } from '@olane/o-tool';
import { oRequest } from '@olane/o-core';
import { GetDataResponse } from '../interfaces/get-data.response.js';
import { oStorageResolver } from '../router/storage.resolver.js';
import { oNodeConfig, oNodeTool } from '@olane/o-node';

export abstract class StorageProviderTool extends oNodeTool {
  constructor(config: oNodeConfig) {
    super(config);
  }

  abstract _tool_put(request: oRequest): Promise<ToolResult>;

  abstract _tool_get(request: oRequest): Promise<GetDataResponse>;

  abstract _tool_delete(request: oRequest): Promise<ToolResult>;

  abstract _tool_has(request: oRequest): Promise<ToolResult>;

  async initialize(): Promise<void> {
    await super.initialize();
    this.router.addResolver(new oStorageResolver(this.address), true);
  }
}
