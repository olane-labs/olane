import { RequestState } from '../../connection/interfaces/request-state.enum.js';
import { oRequest } from '../../connection/o-request.js';

export class oRequestManager {
  private requests: oRequest[] = [];
  constructor() {}

  addRequest(request: oRequest): void {
    this.requests.push(request);
  }

  removeRequest(request: oRequest): void {
    this.requests = this.requests.filter((r) => r !== request);
  }

  getRequest(id: string): oRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  get activeRequests(): oRequest[] {
    return this.requests.filter((r) => r.state === RequestState.PENDING);
  }
}
