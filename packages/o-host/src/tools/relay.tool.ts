import { hostRelayLibp2pConfig } from '../config';
import { oHostTool } from './host.tool';

export class oRelayTool extends oHostTool {
  configureTransports(): any[] {
    return hostRelayLibp2pConfig.transports || [];
  }
}
