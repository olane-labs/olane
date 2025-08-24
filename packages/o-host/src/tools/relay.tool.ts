import { hostRelayLibp2pConfig } from '../config.js';
import { oHostTool } from './host.tool.js';

export class oRelayTool extends oHostTool {
  configureTransports(): any[] {
    return hostRelayLibp2pConfig.transports || [];
  }
}
