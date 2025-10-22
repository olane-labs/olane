import { ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpTool } from './mcp.tool.js';
import { MCP_BRIDGE_METHODS } from './methods/mcp-bridge.methods.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeConfig, oNodeToolConfig } from '@olane/o-node';

export class McpBridgeTool extends oLaneTool {
  private addedRemoteServers: Set<string> = new Set();

  constructor(config: oNodeConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://mcp'),
      description:
        'Model context protocol (MCP) tool for adding MCP servers to the network',
      methods: MCP_BRIDGE_METHODS,
    });
  }

  async _tool_validate_url(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { mcpServerUrl } = params;
    // check the URL contents to see if it is a valid MCP server or a link describing one
    const response = await this.use(new oAddress('o://perplexity'), {
      method: 'completion',
      params: {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `Is this url an MCP server: ${mcpServerUrl}? Be concise in your answer.`,
          },
        ],
      },
    });

    return {
      result: (response.result.data as any).message,
    };
  }

  async _tool_add_remote_server(request: oRequest): Promise<ToolResult> {
    const params = request.params;

    // params have already been validated
    const { mcpServerUrl, headers, name, description } = params;
    try {
      if (this.addedRemoteServers.has(mcpServerUrl as string)) {
        throw new Error('MCP server already added: ' + mcpServerUrl);
      }
      this.logger.debug('Adding MCP server: ' + mcpServerUrl);
      const transport = new StreamableHTTPClientTransport(
        new URL(mcpServerUrl as string),
        {
          requestInit: {
            headers: headers as Record<string, string>,
          },
        },
      );

      const mcpClient = new Client({
        name: 'o-node:mcp:' + this.peerId.toString(),
        version: '1.0.0',
        headers: headers,
      });
      await mcpClient.connect(transport);
      await this.createMcpTool(
        mcpClient,
        mcpServerUrl as string,
        name as string,
        description as string,
      );
      this.addedRemoteServers.add(mcpServerUrl as string);
      return {
        _save: true,
        message:
          'Successfully added MCP server with ' +
          this.hierarchyManager.getChildren().length +
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

  async _tool_search(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { name, provider, functionality } = params;
    let count = 0;
    const response = await this.use(new oAddress('o://perplexity'), {
      method: 'completion',
      params: {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `Search for model context protocol servers. Return all of the information necessary to connect or run the MCP server. Necessary information may include: command to run the MCP server, arguments to run the MCP server, headers to send to the MCP server, remote mcp url, and any other information necessary to run the MCP server. The MCP server is described by:
            ${provider ? `${++count}. Provider: ${provider}` : ''}
            ${name ? `${++count}. Name: ${name}` : ''}
            ${functionality ? `${++count}. Functionality: ${functionality}` : ''}`,
          },
        ],
      },
    });
    return {
      result: (response.result.data as any).message,
    };
  }

  async createMcpTool(
    mcpClient: Client,
    url: string,
    name?: string,
    description?: string,
  ): Promise<McpTool> {
    this.logger.debug('Creating MCP tool: ', name, url);

    const mcpTool = new McpTool({
      name: name || 'mcp-' + Date.now(),
      description: description || 'MCP server for ' + url,
      address: new oAddress(`o://${name || `mcp-${Date.now()}`}`),
      mcpClient: mcpClient,
      dependencies: [],
      leader: this.leader,
      parent: this.address,
    });
    await mcpTool.setupTools();
    await mcpTool.start();
    this.addChildNode(mcpTool);

    await this.useChild(mcpTool.address, {
      method: 'index_network',
      params: {},
    });

    return mcpTool;
  }
}
