import { oNodeConfig } from '@olane/o-node';

export interface OlaneOSConfig {
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
  nodes?: oNodeConfig[];
  lanes?: string[];
  noIndexNetwork?: boolean;
  inProgress?: string[];
}
