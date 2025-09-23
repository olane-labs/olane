export enum RestrictedAddresses {
  GLOBAL_PREFIX = 'o://',
  REGISTRATION = 'register',
  LEADER = 'leader',
  TOOL = 'tool',
  AGENT = 'agent',
}

export const REGISTRATION_ADRESS =
  RestrictedAddresses.GLOBAL_PREFIX + RestrictedAddresses.REGISTRATION;

export const LEADER_ADRESS =
  RestrictedAddresses.GLOBAL_PREFIX + RestrictedAddresses.LEADER;

export const TOOL_ADRESS =
  RestrictedAddresses.GLOBAL_PREFIX + RestrictedAddresses.TOOL;

export const AGENT_ADRESS =
  RestrictedAddresses.GLOBAL_PREFIX + RestrictedAddresses.AGENT;

export const RestrictedAddressesList = [
  REGISTRATION_ADRESS,
  LEADER_ADRESS,
  TOOL_ADRESS,
  AGENT_ADRESS,
];
