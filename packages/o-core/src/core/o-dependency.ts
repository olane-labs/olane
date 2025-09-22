import { oDependency as oDependencyType } from '@olane/o-protocol';

export class oDependency implements oDependencyType {
  address: string;
  version?: string;

  constructor(config: oDependencyType) {
    this.address = config.address;
    this.version = config.version;
  }

  toJSON(): oDependencyType {
    return {
      address: this.address,
      version: this.version,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
