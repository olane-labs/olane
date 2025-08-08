import { Libp2p, Libp2pEvents, ServiceFactoryMap } from '@olane/o-config';
import { Logger } from '../..';

export const NETWORK_ACTIVITY_EVENTS: NetworkActivityEvent[] = [
  'peer:connect',
  'peer:disconnect',
  'peer:update',
  'peer:discovery',
  'peer:reconnect-failure',
  'peer:identify',
  'transport:listening',
  'transport:close',
  'connection:prune',
  'connection:open',
  'connection:close',
  'certificate:provision',
  'certificate:renew',
];

type NetworkActivityEvent = keyof Libp2pEvents<ServiceFactoryMap>;

export class NetworkActivity {
  constructor(
    private readonly logger: Logger,
    private readonly p2pNode: Libp2p,
  ) {
    this.setup();
  }

  setup() {
    for (const event of NETWORK_ACTIVITY_EVENTS) {
      this.p2pNode.addEventListener(event, (evt: any) => {
        this.logger.debug('Network activity: ', event, evt.detail);
      });
    }
  }
}
