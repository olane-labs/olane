import { oNodeToolConfig } from '@olane/o-node';

export type ApprovalMode = 'allow' | 'review' | 'auto';

export interface ApprovalPreferences {
  whitelist?: string[]; // ['o://storage/get', 'o://intelligence/prompt']
  blacklist?: string[]; // ['o://storage/delete']
  timeout?: number; // milliseconds, default 180000 (3 minutes)
}

export interface oApprovalConfig extends oNodeToolConfig {
  mode?: ApprovalMode;
  preferences?: ApprovalPreferences;
}
