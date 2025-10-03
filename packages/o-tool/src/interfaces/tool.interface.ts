import { oCoreConfig } from '@olane/o-core';

export interface oToolConfig extends Omit<oCoreConfig, 'address'> {}
