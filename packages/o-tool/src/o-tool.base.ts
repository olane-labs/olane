import {
  CoreUtils,
  oAddress,
  oConnection,
  oCore,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { IncomingStreamData, pipe, Stream } from '@olane/o-config';
import {
  oParameter,
  oProtocolMethods,
  oRouterRequest,
  RequestParams,
} from '@olane/o-protocol';
import { RunResult } from './interfaces/run-result.interface.js';
import { ToolResult } from './interfaces/tool-result.interface.js';
import { ToolUtils } from './utils/tool.utils.js';
import { v4 as uuidv4 } from 'uuid';
import { MethodUtils } from './utils/method.utils.js';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export class oToolBase extends oCore {
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

  connect(
    nextHopAddress: oAddress,
    targetAddress: oAddress,
  ): Promise<oConnection> {
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

  async use(
    address: oAddress,
    data: {
      [key: string]: unknown;
    },
  ): Promise<oResponse> {
    // check if we call ourselves
    if (
      address.toString() === this.address.toString() ||
      address.toString() === this.staticAddress.toString()
    ) {
      // let's call our own tool
      this.logger.debug('Calling ourselves, skipping...', data);

      const request = new oRequest({
        method: data.method as string,
        params: {
          _connectionId: 0,
          _requestMethod: data.method,
          ...(data.params as any),
        },
        id: 0,
      });
      let success = true;
      const result = await this.execute(request).catch((error) => {
        this.logger.error('Error executing tool: ', error);
        success = false;
        const responseError: oError =
          error instanceof oError
            ? error
            : new oError(oErrorCodes.UNKNOWN, error.message);
        return {
          error: responseError.toJSON(),
        };
      });

      if (success) {
        this.metrics.successCount++;
      } else {
        this.metrics.errorCount++;
      }
      return ToolUtils.buildResponse(request, result, result?.error);
    }
    return super.use(address, data);
  }

  async handleStream(streamData: IncomingStreamData): Promise<void> {
    const { stream } = streamData;
    const requestConfig: oRequest = await CoreUtils.processStream(stream);
    const request = new oRequest(requestConfig);
    let success = true;
    const result = await this.execute(request, stream).catch((error) => {
      this.logger.error('Error executing tool: ', error, typeof error);
      success = false;
      const responseError: oError =
        error instanceof oError
          ? error
          : new oError(oErrorCodes.UNKNOWN, error.message);
      return {
        error: responseError.toJSON(),
      };
    });
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    // compose the response & add the expected connection + request fields

    const response: oResponse = ToolUtils.buildResponse(
      request,
      result,
      result?.error,
    );

    // add the request method to the response
    return CoreUtils.sendResponse(response, streamData.stream);
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
        'Missing required parameters',
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

  myTools(obj?: any): string[] {
    return Object.getOwnPropertyNames(obj || this.constructor.prototype)
      .filter((key) => key.startsWith('_tool_'))
      .filter((key) => !!key)
      .map((key) => key.replace('_tool_', ''));
  }

  findMethod(method: string): string | undefined {
    return this.myTools().find((key) => key.startsWith('_tool_' + method));
  }

  myToolParams(tool: string): Record<string, any> {
    const func = Object.keys(this).find((key) =>
      key.startsWith('_params_' + tool),
    );
    if (!func) {
      throw new Error(`Tool ${tool} not found`);
    }
    // @ts-ignore
    return this[func]();
  }

  async _tool_route(
    request: oRouterRequest & { stream?: Stream },
  ): Promise<any> {
    const { payload } = request.params;
    const { address } = request.params;

    const destinationAddress = new oAddress(address as string);

    // determine the next hop address from the encapsulated address
    const { nextHopAddress, targetAddress } =
      await this.router.translate(destinationAddress);

    this.logger.debug(
      'Next hop address: ',
      nextHopAddress.toString(),
      nextHopAddress.transports,
    );
    // prepare the request for the destination receiver
    let forwardRequest: oRequest = new oRequest({
      params: payload.params as RequestParams,
      id: request.id as string,
      method: payload.method as string,
    });
  }

  async _tool_add_child(request: oRequest): Promise<any> {
    throw new oError(oErrorCodes.NOT_IMPLEMENTED, 'Add child not implemented');
  }

  async _tool_child_register(request: oRequest): Promise<any> {
    const { address }: any = request.params;
    const childAddress = new oAddress(address);
    this.hierarchyManager.addChild(childAddress);
    return {
      message: 'Child node registered with parent!',
    };
  }

  // TODO: implement this
  async _tool_cancel_request(request: oRequest): Promise<ToolResult> {
    const { requestId } = request.params;
    // delete this.requestManager.remove(requestId as string);
    return {
      message: 'Request cancelled',
    };
  }

  async callMyTool(request: oRequest, stream?: Stream): Promise<ToolResult> {
    const method = request.method as string;
    this.logger.debug('Calling tool: ' + method);
    // TODO: implement this
    // this.requests[request.id] = request;
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

  async _tool_index_network(request: oRequest): Promise<ToolResult> {
    this.logger.debug('Indexing network...');
    // collect all the information from the child nodes
    return await this.index();
  }

  async whoami() {
    const metadata = await super.whoami();
    return {
      // @ts-ignore
      tools: this.myTools(),
      description: this.description,
    };
  }

  async _tool_hello_world(request: oRequest): Promise<ToolResult> {
    return {
      message: 'Hello, world!',
    };
  }
}
