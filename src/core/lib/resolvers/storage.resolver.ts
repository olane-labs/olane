import { oAnythingResolver } from './anything.resolver';

const storageTransports = ['/store'];

export class StorageResolver extends oAnythingResolver {
  get transports(): string[] {
    return storageTransports;
  }
  static get transports(): string[] {
    return storageTransports;
  }
}
