import { oAnythingResolver } from '@olane/o-core';

const planTransports = ['/plan'];

export class PlanResolver extends oAnythingResolver {
  get transports(): string[] {
    return planTransports;
  }
  static get transports(): string[] {
    return planTransports;
  }
}
