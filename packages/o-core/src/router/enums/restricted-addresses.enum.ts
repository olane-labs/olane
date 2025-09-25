export enum RestrictedAddresses {
  REGISTRY = 'o://registry',
  LEADER = 'o://leader',
}

export const REGISTRY_ADRESS = RestrictedAddresses.REGISTRY;

export const LEADER_ADRESS = RestrictedAddresses.LEADER;

export const RestrictedAddressesList = [REGISTRY_ADRESS, LEADER_ADRESS];
