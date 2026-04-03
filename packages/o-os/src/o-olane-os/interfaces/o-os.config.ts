import { oNodeConfig } from '@olane/o-node';

export type ApprovalMode = 'allow' | 'review' | 'auto';

export interface ApprovalPreferences {
  whitelist?: string[];
  blacklist?: string[];
  timeout?: number;
}

export interface OSRelayNodeConfig {
  /** Mark this node as a relay that forwards between local and remote leaders. */
  relay: boolean;
  /** The remote leader address this relay connects to. */
  remoteLeaderAddress?: string;
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
  nodes?: (oNodeConfig & Partial<OSRelayNodeConfig>)[];
  lanes?: string[];
  noIndexNetwork?: boolean;
  inProgress?: string[];
  approvalMode?: ApprovalMode;
  approvalPreferences?: ApprovalPreferences;
  /** Copass ID linked to this OS instance. */
  copassId?: string;
  /** World configurations managed by this OS. */
  worlds?: WorldReference[];
}

export interface WorldReference {
  id: string;
  name: string;
}
