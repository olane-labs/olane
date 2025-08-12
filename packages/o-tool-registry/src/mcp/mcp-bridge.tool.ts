import { oTool, oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oDependency, oRequest, oVirtualNode } from '@olane/o-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpTool } from './mcp.tool';
import { MCP_BRIDGE_METHODS } from './methods/mcp-bridge.methods';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class McpBridgeTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://mcp'),
      description: 'Tool to help add MCP servers to the network',
      methods: MCP_BRIDGE_METHODS,
    });
  }

  async _tool_add_remote_server(request: oRequest): Promise<ToolResult> {
    const params = request.params;

    // params have already been validated
    const { mcpServerUrl } = params;
    try {
      this.logger.debug('Adding MCP server: ' + mcpServerUrl);
      const transport = new StreamableHTTPClientTransport(
        new URL(mcpServerUrl as string),
      );

      const mcpClient = new Client({
        name: 'o-node:mcp:' + this.peerId.toString(),
        version: '1.0.0',
      });
      await mcpClient.connect(transport);
      await this.createMcpTool(mcpClient, mcpServerUrl as string);
      return {
        message:
          'Successfully added MCP server with ' +
          this.childNodes.length +
          ' tools',
      };
    } catch (e: any) {
      throw new Error(
        'Error when trying to add MCP server (' +
          mcpServerUrl +
          ') to the network: ' +
          e?.message,
      );
    }
  }

  async _tool_add_remote_server_with_api_key(
    request: oRequest,
  ): Promise<ToolResult> {
    const params = request.params;

    // params have already been validated
    const { mcpServerUrl, apiKey } = params;
    try {
      // let apiKey = apiKeyInput as string;
      // if (apiKey.indexOf('o://') > -1) {
      //   const {
      //     result: { data },
      //   }: any = await this.use(new oAddress('o://vault'), {
      //     method: 'get',
      //     params: { key: apiKeyInput },
      //   });
      //   apiKey = data.value;
      // }
      this.logger.debug('Adding API keyed MCP server: ' + mcpServerUrl, apiKey);
      const transport = new StreamableHTTPClientTransport(
        new URL(mcpServerUrl as string),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        },
      );

      const mcpClient = new Client({
        name: 'o-node:mcp:' + this.peerId.toString(),
        version: '1.0.0',
      });
      await mcpClient.connect(transport);
      await this.createMcpTool(mcpClient, mcpServerUrl as string);
      return {
        _save: true,
        message:
          'Successfully added MCP server with ' +
          this.childNodes.length +
          ' tools',
      };
    } catch (e: any) {
      throw new Error(
        'Error when trying to add MCP server (' +
          mcpServerUrl +
          ') to the network: ' +
          e?.message,
      );
    }
  }

  async _tool_add_local_server(request: oRequest): Promise<ToolResult> {
    const params = request.params;

    this.logger.debug('Adding local MCP server: ', params);

    // params have already been validated
    const { command, args, name } = params;

    // this.logger.debug('Adding local MCP server: ' + mcpServerUrl);
    const transport = new StdioClientTransport({
      command: command as string,
      args: args as string[],
    });

    const mcpClient = new Client({
      name: 'o-node:mcp:' + this.peerId.toString(),
      version: '1.0.0',
    });
    await mcpClient.connect(transport);
    await this.createMcpTool(
      mcpClient,
      (args as string[]).join(' '),
      name as string,
    );

    return {
      _save: true,
      message: 'Successfully added local MCP server',
    };
  }

  async createMcpTool(
    mcpClient: Client,
    url: string,
    name?: string,
  ): Promise<McpTool> {
    this.logger.debug('Creating MCP tool: ', name, url);

    const mcpTool = new McpTool({
      name: name || 'mcp-' + Date.now(),
      description: 'MCP server for ' + url,
      address: new oAddress(`o://${name || `mcp-${Date.now()}`}`),
      mcpClient: mcpClient,
      dependencies: [],
      leader: this.config.leader,
      parent: this.address,
    });
    this.addChildNode(mcpTool);
    await this.startChildren();

    await this.use(
      mcpTool.address,
      {
        method: 'index_network',
        params: {},
      },
      {
        noIndex: true,
      },
    );

    return mcpTool;
  }
}
