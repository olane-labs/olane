export class RemoteUtils {
  static getRemoteAddress(): string {
    return (
      process.env.OLANE_ADDRESS || '/dns4/leader.olane.com/tcp/4000/tls/ws'
    );
  }
}
