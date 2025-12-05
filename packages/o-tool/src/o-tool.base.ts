import {
  oAddress,
  oConnection,
  oCore,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
  oNotificationManager,
  oConnectionConfig,
} from '@olane/o-core';
import { Stream } from '@olane/o-config';
import { oProtocolMethods } from '@olane/o-protocol';
import { RunResult } from './interfaces/run-result.interface.js';
import { ToolResult } from './interfaces/tool-result.interface.js';
import { v4 as uuidv4 } from 'uuid';
import { MethodUtils } from './utils/method.utils.js';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export class oToolBase extends oCore {
  private indexed: boolean = false;

  validateToolCall(oRequest: oRequest): boolean {
    const method = oRequest.method as string;
    if (!method) {
      throw new Error('method parameter is required');
    }
    // @ts-ignore
    if (!this[`_tool_${method}`]) {
      throw new Error(`Tool ${method} is not implemented`);
    }
    return true;
  }

  configureTransports(): any[] {
    return [];
  }

  connect(config: oConnectionConfig): Promise<oConnection> {
    throw new oError(oErrorCodes.NOT_IMPLEMENTED, 'Connect not implemented');
  }
  initializeRouter(): Promise<void> {
    throw new oError(
      oErrorCodes.NOT_IMPLEMENTED,
      'Initialize router not implemented',
    );
  }
  unregister(): Promise<void> {
    throw new oError(oErrorCodes.NOT_IMPLEMENTED, 'Unregister not implemented');
  }
  register(): Promise<void> {
    throw new oError(oErrorCodes.NOT_IMPLEMENTED, 'Register not implemented');
  }

  protected createNotificationManager(): oNotificationManager {
    throw new oError(
      oErrorCodes.NOT_IMPLEMENTED,
      'createNotificationManager not implemented',
    );
  }

  async execute(req: oRequest, stream?: Stream): Promise<RunResult> {
    let request = req;
    const requestConfig = req.toJSON();

    // validate and run the tool
    this.validateToolCall(request);

    // check if it's a route and we have reached the destination
    if (
      request.method === oProtocolMethods.ROUTE &&
      request.params.address === this.address.value
    ) {
      const { payload }: any = request.params;

      request = new oRequest({
        id: requestConfig.id,
        method: payload.method,
        params: {
          _connectionId: requestConfig.params?._connectionId,
          _requestMethod: payload.method,
          ...(payload.params || {}), // TODO: is this correct? this line used to be ...payload
        },
      });
    }

    const result = await this.run(request, stream);

    return result;
  }

  async run(request: oRequest, stream?: Stream): Promise<RunResult> {
    const missingParams = MethodUtils.findMissingParams(
      this,
      request.method,
      request.params || {},
    );
    if (missingParams.length > 0) {
      this.logger.error(
        'Missing required parameters: ',
        missingParams,
        ' with passed params: ',
        request.params,
      );
      throw new oError(
        oErrorCodes.MISSING_PARAMETERS,
        'Missing required parameters: ' + missingParams.map(({ name }) => name).join(','),
        {
          parameters: missingParams,
          toolAddress: this.address.toString(),
          data: request.params,
        },
      );
    }
    let result = await this.callMyTool(request, stream);
    return result;
  }

  myTools(obj?: any): Promise<string[]> {
    return Promise.resolve(
      Object.getOwnPropertyNames(obj || this.constructor.prototype)
        .filter((key) => key.startsWith('_tool_'))
        .filter((key) => !!key)
        .map((key) => key.replace('_tool_', '')),
    );
  }

  async findMethod(method: string): Promise<string | undefined> {
    return (await this.myTools()).find((key) => key.startsWith(method));
  }

  async callMyTool(request: oRequest, stream?: Stream): Promise<ToolResult> {
    const method = request.method as string;
    if (method !== 'route') {
      this.logger.verbose('Calling tool: ' + method);
    }
    // TODO: implement this
    // this.requests[request.id] = request;
    // @ts-ignore
    if (!this[`_tool_${method}`]) {
      throw new oError(oErrorCodes.INVALID_ACTION, 'Selected method does not exist');
    }
    // @ts-ignore
    const result = await this[`_tool_${method}`]({
      ...request.toJSON(),
      stream,
    }).catch((error: any) => {
      // delete this.requests[request.id];
      throw error;
    });
    // delete this.requests[request.id];
    return result;
  }

  async index() {
    if (this.indexed) {
      this.logger.verbose('Tool already indexed, skipping...');
      return {
        summary: 'Tool already indexed',
      };
    }
    this.indexed = true;
    // perform index
    const metadata = await this.whoami();
    if (!metadata.tools.length && !metadata.description) {
      this.logger.warn('No metadata found, skipping...');
      return {
        provider: 'Empty node',
        summary: 'Empty node',
      };
    }
    for (const method in this.methods) {
      const m = this.methods[method];
      await this.use(new oAddress('o://vector-store'), {
        method: 'add_documents',
        params: {
          documents: [
            {
              pageContent: m.description,
              metadata: {
                address: this.address?.toString() + '/' + method,
                id: uuidv4(),
              },
            },
          ],
        },
      });
    }
    let summary = metadata.description ? metadata.description : null;
    if (!summary) {
      this.logger.debug('No description found, generating summary...');
      const response = await this.use(new oAddress('o://intelligence'), {
        method: 'prompt',
        params: {
          prompt:
            `You are a helpful assistant that summarizes what a service does by looking at the service description and the details of the tools that the service contains. \n
                Format the output in JSON using this template:` +
            JSON.stringify({
              summary: 'string',
            }) +
            'Do NOT include any other text other than the JSON response. The following is the JSON input of the service: ' +
            JSON.stringify(metadata),
        },
      });
      const { result }: any = response;
      const { success }: { success: boolean } = result;
      if (!success) {
        this.logger.error('Failed to index network: ', result);
        throw new Error('Failed to index network');
      }
      const data: any = result.data;
      const { message }: { message: string } = data;
      const json = JSON.parse(message);
      summary = json.summary;
      // update the description to avoid re-indexing
      if (summary) {
        this.config.description = summary;
      }
    }

    try {
      if (summary) {
        await this.use(new oAddress('o://vector-store'), {
          method: 'add_documents',
          params: {
            documents: [
              {
                pageContent: summary,
                metadata: {
                  address: this.address?.toString(),
                  id: uuidv4(),
                },
              },
            ],
          },
        });
      }
      return {
        summary: summary,
      };
    } catch (e) {
      this.logger.error('Error indexing network: ', e);
      throw e;
    }
  }

  async whoami() {
    const metadata = await super.whoami();
    return {
      // @ts-ignore
      tools: await this.myTools(),
      description: this.description,
    };
  }
}
