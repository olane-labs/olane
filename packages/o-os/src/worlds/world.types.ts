export type WorldSupportedType = 'filepath';

export interface WorldConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  networkId?: string;
  supportedTypes: WorldSupportedType[];
  members: string[];
  createdAt: string;
  createdBy?: string;
}

export interface WorldAddressEntry {
  address: string;
  type: WorldSupportedType;
  registeredAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorldData {
  config: WorldConfig;
  addresses: WorldAddressEntry[];
}
