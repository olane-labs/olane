import { ToolResult } from '@olane/o-tool';
import { oRegistrationParams } from '@olane/o-protocol';
import { oAddress, oRequest } from '@olane/o-core';
import { REGISTRY_PARAMS } from './methods/registry.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeConfig, oNodeToolConfig } from '@olane/o-node';

export abstract class RegistryTool extends oLaneTool {
  protected readonly registry: Map<string, oRegistrationParams> = new Map();
  protected readonly protocolMapping: Map<string, string[]> = new Map();

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://registry'),
      methods: REGISTRY_PARAMS,
      description: 'Network registry of tools and their respective addresses',
    });
  }

  abstract _tool_commit(request: oRequest): Promise<ToolResult>;
  abstract _tool_search(request: oRequest): Promise<ToolResult>;
  abstract _tool_find_all(request: oRequest): Promise<ToolResult>;
  abstract _tool_remove(request: oRequest): Promise<ToolResult>;
}
