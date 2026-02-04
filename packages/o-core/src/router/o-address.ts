import { CID } from 'multiformats';
import { oObject } from '../core/o-object.js';
import { TransportType } from '../transports/index.js';
import { oTransport } from '../transports/o-transport.js';
import { CoreUtils } from '../utils/core.utils.js';
import { RestrictedAddresses } from './enums/restricted-addresses.enum.js';

export class oAddress extends oObject {
  public transports: oTransport[];

  constructor(
    public readonly value: string,
    transports: oTransport[] = [],
  ) {
    super(value);
    this.transports = transports;
  }

  get libp2pTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.LIBP2P) || [];
  }

  get customTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.CUSTOM) || [];
  }

  equals(other: oAddress): boolean {
    return this.value === other.value && this.transportsEqual(other);
  }

  transportsEqual(other: oAddress): boolean {
    return this.transports.every((t) =>
      other.transports.some((t2) => t.toString() === t2.toString()),
    );
  }

  setTransports(transports: oTransport[]): void {
    this.transports = transports;
  }

  validate(): boolean {
    if (!this.value?.startsWith('o://')) {
      return false;
    }
    return true;
  }

  /**
   * Check if this address contains a nested path
   * @returns true if address contains '/' in the path portion (e.g., 'o://parent/child')
   */
  isNested(): boolean {
    const paths = this.paths; // Strips 'o://' prefix
    return paths.includes('/');
  }

  /**
   * Validates that this address is not nested (for constructor validation)
   * @throws Error if address contains nested paths
   */
  validateNotNested(): void {
    if (this.isNested()) {
      throw new Error(
        `Invalid address: "${this.value}". ` +
          `Nested addresses should not be created directly in node constructors. ` +
          `Use simple addresses (e.g., "o://tool-name") and let the system ` +
          `create hierarchical addresses during parent/leader registration. ` +
          `\n\nExample:\n` +
          `  ✅ CORRECT: new oNodeAddress('o://my-tool')\n` +
          `  ❌ WRONG:   new oNodeAddress('o://my-tool/type2')\n\n` +
          `If you need nested addresses at runtime, they will be created ` +
          `automatically during registration with parent/leader.\n\n` +
          `For more info, see CLAUDE.md Section 4: Parent-Child System`,
      );
    }
  }

  get paths(): string {
    return this.value.replace('o://', '');
  }

  get protocol(): string {
    return this.value.replace('o://', '/o/');
  }

  get root(): string {
    return 'o://' + this.paths.split('/')[0];
  }

  toStaticAddress(): oAddress {
    const paths = this.paths.split('/');
    if (paths.length === 0) {
      return this;
    }
    return new oAddress(`o://${paths[paths.length - 1]}`, this.transports);
  }

  toRootAddress(): oAddress {
    const paths = this.paths.split('/');
    if (paths.length === 0) {
      return this;
    }
    return new oAddress(`o://${paths[0]}`);
  }

  toString(): string {
    return this.value;
  }

  toJSON(): {
    value: string;
    transports: string[];
  } {
    return {
      value: this.value,
      transports: this.transports.map((t) => t.toString()),
    };
  }

  supportsTransport(transport: oTransport): boolean {
    return this.transports.some((t) => t.type === transport.type);
  }

  async toCID(): Promise<CID> {
    return await CoreUtils.toCID({ address: this.toString() });
  }

  async hash(): Promise<string> {
    return (await CoreUtils.toCID(this.toJSON())).toString();
  }

  static equals(a: oAddress, b: oAddress): boolean {
    return a.value === b.value;
  }

  static leader(): oAddress {
    return new oAddress(RestrictedAddresses.LEADER);
  }

  static lane(): oAddress {
    return new oAddress(RestrictedAddresses.LANE);
  }

  static registry(): oAddress {
    return new oAddress(RestrictedAddresses.REGISTRY);
  }

  static isStatic(address: oAddress): boolean {
    return address.value.startsWith(RestrictedAddresses.LEADER) === false;
  }

  static next(address: oAddress, targetAddress: oAddress): oAddress {
    const remainingPath = targetAddress.protocol.replace(
      address.protocol + '/',
      '',
    );
    // we are at the destination
    if (remainingPath === '') {
      return address;
    }
    // if remainingPath equals targetAddress.protocol, the replace didn't match
    // this means we're either at destination (addresses are equal) or on different branch
    if (remainingPath === targetAddress.protocol) {
      // check if we're actually at the destination
      if (address.value === targetAddress.value) {
        return address;
      }
      // we're on a different branch, need to go back to leader for resolution
      if (!address.equals(oAddress.leader())) {
        return oAddress.leader();
      }
      // we ARE the leader, and we can't make progress - stay at leader for resolution
      return address;
    }
    // do we need to go back to the leader?
    if (
      !address.equals(oAddress.leader()) && // if we are a leader, do not got back to self
      oAddress.isStatic(targetAddress)
    ) {
      return oAddress.leader();
    }
    // we need to go to the child address
    const nextHop = remainingPath.replace('/o/', '').split('/').reverse().pop();
    return new oAddress(address.value + '/' + nextHop);
  }
}
