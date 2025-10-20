import { oNodeConfig } from '@olane/o-node';

export type ApprovalMode = 'allow' | 'review' | 'auto';

export interface ApprovalPreferences {
  whitelist?: string[];
  blacklist?: string[];
  timeout?: number;
}

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
  approvalMode?: ApprovalMode;
  approvalPreferences?: ApprovalPreferences;
}
