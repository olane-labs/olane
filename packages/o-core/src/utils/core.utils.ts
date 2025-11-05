import {
  generateKeyPairFromSeed,
  createEd25519PeerId,
  Stream,
  pushable,
  Uint8ArrayList,
} from '@olane/o-config';
import { createHash } from 'crypto';
import { oAddress } from '../router/o-address.js';
import { oResponse } from '../connection/o-response.js';
import { oRequest } from '../connection/o-request.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { oObject } from '../core/o-object.js';

export class CoreUtils extends oObject {
  static async generatePeerId(): Promise<any> {
    const peerId = await createEd25519PeerId();
    return peerId;
  }

  static doHealthCheck(address: oAddress, node: any): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Health check timed out'));
      }, 30_000); // 30 seconds

      const response = await node.use(
        new oAddress(address.toString() + '/ping', address.transports),
      );
      clearTimeout(timer);
      if (response.result.error) {
        reject(new Error('Health check failed'));
      } else {
        resolve(true);
      }
    });
  }

  static async healthCheck(config: {
    type?: 'leader' | 'parent' | 'child';
    address?: oAddress;
    node: any;
    timeout?: number;
  }): Promise<boolean> {
    if (!config.node) {
      throw new Error('Node is required');
    }

    const { type, address, node } = config;
    if (type === 'leader') {
      return CoreUtils.doHealthCheck(node.leader, node);
    } else if (type === 'parent') {
      return CoreUtils.doHealthCheck(node.parent, node);
    } else if (type === 'child') {
      const children = node.hierarchyManager.getChildren();
      return (
        await Promise.all(
          children.map((child: oAddress) =>
            CoreUtils.doHealthCheck(child, node),
          ),
        )
      ).every((result) => result === true);
    }

    if (address) {
      return CoreUtils.doHealthCheck(address, node);
    }

    throw new Error('Address is required');
  }

  /**
   * @deprecated Use ResponseBuilder.build() instead for consistent response generation with metrics tracking and error handling.
   *
   * Example migration:
   * ```typescript
   * // Old:
   * const response = CoreUtils.buildResponse(request, result, error);
   *
   * // New:
   * const responseBuilder = ResponseBuilder.create().withMetrics(node.metrics);
   * const response = await responseBuilder.build(request, result, error);
   * ```
   *
   * This method will be removed in a future major version.
   */
  static buildResponse(request: oRequest, result: any, error: any): oResponse {
    let success = true;
    if (error) {
      success = false;
    }
    return new oResponse({
      id: request.id,
      data: result,
      error: result?.error,
      ...{ success },
      _last: true,
      _requestMethod: request.method,
      _connectionId: request.params?._connectionId,
    });
  }

  static async generatePrivateKey(seed: string): Promise<any> {
    // Convert any user phrase to exactly 32 bytes using SHA-256
    const seedBytes = CoreUtils.phraseToSeedBytes(seed);

    const privateKey: any = await generateKeyPairFromSeed('Ed25519', seedBytes);
    return privateKey;
  }

  /**
   * Convert any user phrase to exactly 32 bytes for Ed25519 key generation.
   * This function uses SHA-256 hashing to ensure:
   * - Deterministic: Same phrase always produces same seed
   * - Uniform distribution: Good entropy even for weak phrases
   * - Exactly 32 bytes: Meets Ed25519 cryptographic requirements
   */
  public static phraseToSeedBytes(phrase: string): Uint8Array {
    // Use SHA-256 to create a consistent 32-byte hash
    const hash = createHash('sha256').update(phrase, 'utf8').digest();
    return new Uint8Array(hash);
  }

  // Legacy utility function to convert any phrase into a 32-character hex string
  public static phraseToSeed(phrase: string): string {
    // Use SHA-256 to create a consistent 32-byte hash
    const hash = createHash('sha256').update(phrase).digest('hex');
    // Take the first 32 characters of the hex string
    return hash.substring(0, 32);
  }

  public static childAddress(
    parentAddress: oAddress,
    childAddress: oAddress,
  ): oAddress {
    return new oAddress(parentAddress.toString() + '/' + childAddress.paths);
  }

  public static async sendResponse(response: oResponse, stream: Stream) {
    if (stream.status !== 'open') {
      return;
    }

    try {
      await stream.send(new TextEncoder().encode(response.toString()));
      await stream.close();
    } catch (error) {
      console.error('Error sending response: ', error);
    }
  }

  public static async sendStreamResponse(response: oResponse, stream: Stream) {
    const utils = new CoreUtils();
    if (!stream || stream.status !== 'open') {
      utils.logger.warn(
        'Stream is not open. Status: ' + stream?.status || 'undefined',
      );
      return;
    }

    try {
      await stream.send(new TextEncoder().encode(response.toString()));
    } catch (error) {
      utils.logger.error('Error sending stream response: ', error);
    }
  }

  public static async processStream(event: any): Promise<any> {
    const bytes =
      event.data instanceof Uint8ArrayList ? event.data.subarray() : event.data;
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  public static async processStreamRequest(event: any): Promise<oRequest> {
    const req = await CoreUtils.processStream(event);
    return new oRequest(req);
  }

  public static async processStreamResponse(event: any): Promise<oResponse> {
    const res = await CoreUtils.processStream(event);
    return new oResponse({
      ...res.result,
    });
  }

  public static async toCID(data: any): Promise<CID> {
    const bytes = json.encode(data);
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    return cid;
  }
}
