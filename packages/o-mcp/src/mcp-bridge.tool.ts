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
        name: 'o-node:mcp:' + (this as any).peerId.toString(),
        version: '1.0.0',
        headers: headers,
      });
      await mcpClient.connect(transport);
      const mcpTool = await this.createMcpTool(
        mcpClient,
        mcpServerUrl as string,
        name as string,
        description as string,
      );
      this.addedRemoteServers.add(mcpServerUrl as string);
      return {
        _save: true,
        address_to_index: mcpTool.address,
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
      name: 'o-node:mcp:' + (this as any).peerId.toString(),
      version: '1.0.0',
    });
    await mcpClient.connect(transport);

    const mcpTool = await this.createMcpTool(
      mcpClient,
      (args as string[]).join(' '),
      name as string,
    );

    return {
      _save: true,
      address_to_index: mcpTool.address,
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
            content: `Search for model context protocol servers that help with the user's intent. Once an MCP server is found, return the ways to connect or run the MCP server. Include concise instructions around parameters and dependencies if there are any. List MCP endpoint urls that point to the server at the very beginnging of the response.Endpoint values or runtime instructions with arguments or commands must be returned if there are any. Instructions must include: the remote mcp url endpoint, the command to run the MCP server, arguments to run the MCP server, headers to send to the MCP server, and any other information necessary to run the MCP server. If there is a local and a remote option, prefer the remote option.The MCP server is described by:
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
      leader: this.leader as any,
      parent: this.address as any,
    });
    await mcpTool.setupTools();
    await mcpTool.start();
    this.addChildNode(mcpTool);

    return mcpTool;
  }
}
