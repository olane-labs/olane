import path from 'path';
import os from 'os';

export const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.olane');
export const DEFAULT_INSTANCE_PATH = path.join(
  DEFAULT_CONFIG_PATH,
  'os-instances',
);
export const DEFAULT_CONFIG_FILE = path.join(
  DEFAULT_CONFIG_PATH,
  'config.json',
);
