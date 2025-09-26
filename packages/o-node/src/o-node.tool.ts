import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oToolConfig } from './interfaces/tool.interface.js';
import { IncomingStreamData, pipe, Stream } from '@olane/o-config';
import {
  oParameter,
  oProtocolMethods,
  oRouterRequest,
  RequestParams,
} from '@olane/o-protocol';
import { RunResult } from './interfaces/run-result.interface.js';
import { ToolResult } from './interfaces/tool-result.interface.js';
import { ToolUtils } from './tool.utils.js';
import { v4 as uuidv4 } from 'uuid';
import { oNode } from '@olane/o-node';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export function oNodeTool<T extends new (...args: any[]) => oNode>(Base: T): T {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
      const config = args[0] as oToolConfig & { address: oAddress };
    }

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

    async handleProtocol(address: oAddress) {
      this.logger.debug('Handling protocol: ' + address.protocol);
      await this.p2pNode.handle(address.protocol, this.handleStream.bind(this));
    }

    async initialize(): Promise<void> {
      await super.initialize();
      await this.handleProtocol(this.address);
      if (
        this.staticAddress &&
        this.staticAddress?.toString() !== this.address.toString()
      ) {
        await this.handleProtocol(this.staticAddress);
      }
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
      // const protocolUsageCounter = this.p2pNode.metrics?.registerCounter(
      //   'libp2p_protocol_custom_track',
      //   {
      //     help: 'Total number of protocol interactions',
      //     label: this.address.toString(),
      //   },
      // );

      // protocolUsageCounter?.increment();

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
      // TODO: this will process the input and prepare required parameters
      // const processedParams = this.processRunInputs(params);
      const missingParams = this.findMissingParams(
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
      // resolve o:// addresses
      // THIS HAS A RECURSIVE CALL issue
      this.logger.debug(
        'Calling function at address: ',
        this.address.toString(),
        'with request: ',
        request.method,
      );
      // const isPlaceholder = this.address.toString().includes('placeholder');
      // request = await oRequest.translateToRawRequest(request, this);
      let result = await this.callMyTool(request, stream);
      // result = await oRequest.translateResultForAgent(result, this);
      return result;
      // translate to o:// addresses
    }

    async applyBridgeTransports(
      address: oAddress,
      request: oRequest,
    ): Promise<oResponse> {
      throw new oError(
        oErrorCodes.TRANSPORT_NOT_SUPPORTED,
        'Bridge transports not implemented',
      );
    }

    async matchAgainstMethods(address: oAddress): Promise<boolean> {
      const methods = await this.myTools();
      this.logger.debug('Matching against methods: ', methods);
      const method = address
        .toString()
        .replace(this.address.toString() + '/', '');
      return methods.includes(method || '');
    }

    myTools(obj?: any): string[] {
      return Object.getOwnPropertyNames(obj || this.constructor.prototype)
        .filter((key) => key.startsWith('_tool_'))
        .filter((key) => !!key)
        .map((key) => key.replace('_tool_', ''));
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

    async _tool_handshake(handshake: oRequest): Promise<any> {
      this.logger.debug(
        'Performing handshake with intent: ',
        handshake.params.intent,
      );

      const mytools = await this.myTools();

      return {
        tools: mytools.filter((t) => t !== 'handshake' && t !== 'intent'),
        methods: this.methods,
        successes: [],
        failures: [],
        task: undefined,
        type: 'handshake',
      };
    }

    async _tool_route(
      request: oRouterRequest & { stream?: Stream },
    ): Promise<any> {
      const { payload } = request.params;

      const { address } = request.params;
      this.logger.debug('Routing request to: ', address);
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

      // if the next hop is not a libp2p address, we need to communicate to it another way
      if (this.router.supportsAddress(nextHopAddress)) {
        this.logger.debug(
          'Bridge transports supported, applying custom transports...',
        );
        // attempt to resolve with bridge transports
        return this.applyBridgeTransports(nextHopAddress, forwardRequest);
      }

      // assume the next hop is a libp2p address, so we need to set the transports and dial it
      nextHopAddress.setTransports(this.getTransports(nextHopAddress));

      const isAtDestination = nextHopAddress.value === destinationAddress.value;

      // if we are at the destination, let's look for the closest tool that can service the request
      const transports = nextHopAddress.transports.filter(
        (t) => typeof t !== 'string',
      );

      const isMethodMatch = await this.matchAgainstMethods(destinationAddress);
      // handle address -> method resolution
      if (isMethodMatch) {
        this.logger.debug('Method match found, forwarding to self...');
        const extractedMethod = this.extractMethod(destinationAddress);
        try {
          const response = await this.use(this.address, {
            method: payload.method || extractedMethod,
            params: payload.params,
          });
          return response.result.data;
        } catch (error: any) {
          return error;
        }
      }

      const targetStream = await this.p2pNode.dialProtocol(
        transports,
        nextHopAddress.protocol,
      );

      // if not at destination, we need to forward the request to the target
      if (!isAtDestination) {
        forwardRequest = new oRequest(request);
      } else {
        this.logger.debug('At destination!');
      }

      const pushableStream = pushable();
      pushableStream.push(new TextEncoder().encode(forwardRequest.toString()));
      pushableStream.end();
      await targetStream.sink(pushableStream);
      await pipe(targetStream.source, request.stream.sink);
    }

    async _tool_add_child(request: oRequest): Promise<any> {
      const { address, transports }: any = request.params;
      const childAddress = new oAddress(
        address,
        transports.map((t: string) => multiaddr(t)),
      );
      this.childAddresses.push(childAddress);
      return {
        message: 'Child node registered with parent!',
      };
    }

    /**
     * Where all intents go to be resolved.
     * @param request
     * @returns
     */
    async _tool_intent(request: oRequest): Promise<any> {
      this.logger.debug('Intent resolution called: ', request.params);
      const { intent, context, streamTo } = request.params;
      const pc = new oAgentPlan({
        intent: intent as string,
        currentNode: this,
        caller: this.address,
        streamTo: new oAddress(streamTo as string),
        context: context
          ? new oPlanContext([
              `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
            ])
          : undefined,
        shouldContinue: () => {
          return !!this.requests[request.id];
        },
      });

      const response = await pc.execute();
      return {
        ...response,
        cycles: pc.sequence.length,
        sequence: pc.sequence.map((s) => {
          return {
            reasoning: s.result?.reasoning,
            result: s.result?.result,
            error: s.result?.error,
            type: s.result?.type,
          };
        }),
      };
    }

    async callMyTool(request: oRequest, stream?: Stream): Promise<ToolResult> {
      const method = request.method as string;
      this.logger.debug('Calling tool: ' + method);
      this.requests[request.id] = request;
      // @ts-ignore
      const result = await this[`_tool_${method}`]({
        ...request.toJSON(),
        stream,
      }).catch((error: any) => {
        delete this.requests[request.id];
        throw error;
      });
      delete this.requests[request.id];
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

    // ensure that the required parameters are present
    findMissingParams(methodName: string, params: any): oParameter[] {
      const method = this.methods[methodName];
      const protectedMethods = Object.values(oProtocolMethods);
      if (protectedMethods.includes(methodName as oProtocolMethods)) {
        return [];
      }
      if (!method) {
        this.logger.warn(
          'No parameter configuration found for method. This is expected for some methods, but may impact AI performance around improvisation.',
          methodName,
        );
        return [];
      }
      const requiredParams: oParameter[] = method.parameters;
      if (!requiredParams || !requiredParams.filter) {
        this.logger.error(
          '[Provider] No handshake parameters found for method: ',
          methodName,
        );
        return [];
      }
      const missingParams: oParameter[] = requiredParams
        .filter((p) => !params[p.name])
        .filter((p) => p.required === undefined || p.required === true);
      return missingParams;
    }
  };
}
