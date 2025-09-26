import { oNodeConfig } from '@olane/o-node';

export interface oToolConfig extends Omit<oNodeConfig, 'address'> {}
