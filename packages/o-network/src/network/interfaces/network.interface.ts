import { CoreConfig } from '@olane/o-core';

export interface NetworkConfigInterface {
  configFilePath?: string;
  network?: {
    name?: string;
    version?: string;
    description?: string;
    icon?: string;
    website?: string;
    networkId?: string;
    port?: number;
  };
  nodes?: CoreConfig[];
  plans?: string[];
  noIndexNetwork?: boolean;
  inProgress?: string[];
}
