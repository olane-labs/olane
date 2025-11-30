import { oAddress, oError, oErrorCodes, oRequest } from '@olane/o-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { v4 as uuidv4 } from 'uuid';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export class McpTool extends oLaneTool {
  protected mcpClient: Client;

  constructor(
    config: oNodeToolConfig & { address: oAddress; mcpClient: Client },
  ) {
    super({
      ...config,
      address: config.address,
      description:
        config.description ||
        'Tool for wrapping MCP servers to be used as tools in the network',
    });
    this.mcpClient = config.mcpClient;
  }
  // _tool_ functions are dynamically added to the tool based on the MCP server's methods

  async setupTools(): Promise<void> {
    this.logger.debug('Setting up MCP tools');
    const tools = await this.mcpClient.listTools();
    // this.logger.debug('MCP tools: ', tools);
    tools.tools.forEach((tool: any) => {
      this.logger.debug('Setting up MCP server tool: ' + tool.name);
      this.methods[tool.name] = {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema.properties as any,
        dependencies: [],
      };
      // @ts-ignore
      this[`_tool_${tool.name}`] = async (request: oRequest) => {
        this.logger.debug('Calling MCP tool: ' + tool.name, request);
        const params = request.params;
        const result = await this.mcpClient.callTool({
          name: tool.name,
          arguments: params,
        });
        this.logger.debug('MCP tool result: ', result);
        if (result.isError) {
          throw new oError(
            oErrorCodes.UNKNOWN,
            JSON.stringify((result as any).content),
          );
        }
        return result.content;
      };
    });
  }

  async myTools() {
    const tools = await this.mcpClient.listTools();
    return tools.tools.map((tool) => {
      return tool.name;
    });
  }

  // let's customize the index functionality to ensure we capture MCP insights
  async index() {
    const result = await super.index();
    // add each mcp tool to the vector store
    const tools = await this.mcpClient.listTools();
    for (const tool of tools.tools) {
      await this.use(new oAddress('o://vector-store'), {
        method: 'add_documents',
        params: {
          documents: [
            {
              pageContent: tool.description,
              metadata: {
                address: this.address?.toString() + '/' + tool.name,
                id: uuidv4(),
              },
            },
          ],
        },
      });
    }
    return result;
  }

  async whoami(): Promise<any> {
    // do nothing
    const tools = await this.mcpClient.listTools();
    return {
      description: this.description,
      tools: tools.tools.map((tool) => {
        this.logger.debug(
          'MCP Tool Definition: ',
          tool.name,
          tool.description,
          tool.inputSchema,
        );
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema.properties,
        };
      }),
    };
  }
}
