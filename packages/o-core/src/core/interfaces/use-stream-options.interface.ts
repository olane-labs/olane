import { UseOptions } from './use-options.interface';

export interface UseStreamOptions extends Omit<UseOptions, 'isStream'> {}
