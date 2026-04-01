import { oAddress } from '@olane/o-core';
import { oNodeAddress } from '@olane/o-node';

export interface AddressCreateOptions {
  name: string;
  description?: string;
}

/**
 * Factory for creating and validating o:// addresses.
 */
export class AddressFactory {
  /**
   * Create a validated o:// address from a name.
   */
  static createAddress(name: string): oNodeAddress {
    const value = name.startsWith('o://') ? name : `o://${name}`;
    return new oNodeAddress(value);
  }

  /**
   * Generate a unique address with a random suffix.
   */
  static generateUniqueAddress(prefix: string): oNodeAddress {
    const suffix = Math.random().toString(36).substring(2, 8);
    const name = `${prefix}-${suffix}`;
    return AddressFactory.createAddress(name);
  }

  /**
   * Validate that a string is a well-formed o:// address.
   */
  static validate(value: string): boolean {
    try {
      new oAddress(value.startsWith('o://') ? value : `o://${value}`);
      return true;
    } catch {
      return false;
    }
  }
}
