import { RequestState } from '../../connection/interfaces/request-state.enum.js';
import { oConnectionManager } from '../../connection/o-connection-manager.js';
import { oRequest } from '../../connection/o-request.js';
import { oResponse } from '../../connection/o-response.js';
import { oError } from '../../error/o-error.js';
import { oAddress } from '../../router/o-address.js';
import { oRouter } from '../../router/o-router.js';
import { UseDataConfig } from '../interfaces/use-data.config.js';
import { UseOptions } from '../interfaces/use-options.interface.js';
import { oObject } from '../o-object.js';

export abstract class oRequestManager extends oObject {
  protected requests: oRequest[] = [];
  abstract connectionManager?: oConnectionManager;
  abstract router?: oRouter;

  abstract send(
    address: oAddress,
    data?: UseDataConfig,
    options?: UseOptions,
    node?: any,
  ): Promise<oResponse>;

  /**
   * Helper method to handle response errors
   * @param response The response to check for errors
   * @throws oError if the response contains an error
   */
  protected handleResponseError(response: oResponse): void {
    if (response.result.error) {
      throw oError.fromJSON(response.result.error);
    }
  }

  protected addRequest(request: oRequest): void {
    request.state = RequestState.PENDING;
    this.requests.push(request);
  }

  protected removeRequest(request: oRequest): void {
    this.requests = this.requests.filter((r) => r.id !== request.id);
  }

  getRequest(id: string): oRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  isLoading(id: string) {
    const request = this.getRequest(id);
    return request?.state === RequestState.PENDING;
  }

  abstract cancelRequest(id: string): Promise<void>;

  get activeRequests(): oRequest[] {
    return this.requests.filter((r) => r.state === RequestState.PENDING);
  }
}
