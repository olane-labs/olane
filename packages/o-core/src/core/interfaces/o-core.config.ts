import { Libp2pConfig } from '@olane/o-config';
import { oAddress } from '../../router/o-address.js';
import { NodeType } from './node-type.enum.js';
import { oDependency, oMethod } from '@olane/o-protocol';

export interface oCoreConfig {
  address: oAddress;
  leader: oAddress | null;
  parent: oAddress | null;
  type?: NodeType;
  seed?: string;
  name?: string;
  network?: Libp2pConfig;
  metrics?: boolean;
  description?: string;
  dependencies?: oDependency[];
  methods?: { [key: string]: oMethod };
  cwd?: string;
  systemName?: string;
}
