import {
  generateKeyPairFromSeed,
  createEd25519PeerId,
  Stream,
  Uint8ArrayList,
  lpStream,
} from '@olane/o-config';
import { createHash } from 'crypto';
import { oAddress } from '../router/o-address.js';
import { oResponse } from '../connection/o-response.js';
import { oRequest } from '../connection/o-request.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { oObject } from '../core/o-object.js';
import { Readable } from 'stream';
import StreamJson from 'stream-json';
import StreamValues from 'stream-json/streamers/StreamValues.js';
import { chain } from 'stream-chain';

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

  /**
   * Sends a response through a stream
   * Consolidated method that handles both regular and streaming responses
   *
   * @param response - The response to send
   * @param stream - The stream to send the response through
   */
  public static async sendResponse(response: oResponse, stream: Stream) {
    const utils = new CoreUtils();

    if (!stream || stream.status !== 'open') {
      utils.logger.warn(
        'Stream is not open. Status: ' + (stream?.status || 'undefined'),
      );
      return;
    }

    try {
      await stream.send(new TextEncoder().encode(response.toString()));
    } catch (error) {
      utils.logger.error('Error sending response: ', error);
    }
  }

  /**
   * @deprecated Use sendResponse instead - both methods are now identical
   * Sends a streaming response through a stream
   * This method is maintained for backward compatibility
   */
  public static async sendStreamResponse(response: oResponse, stream: Stream) {
    return CoreUtils.sendResponse(response, stream);
  }

  public static async extractAllJsonObjects(
    jsonString: string,
  ): Promise<any[]> {
    const stream = Readable.from([jsonString]);

    const pipeline = chain([
      stream,
      StreamJson.parser(),
      StreamValues.streamValues(),
    ]);

    const objects = [];

    for await (const data of pipeline) {
      objects.push(data.value);
    }

    return objects;
  }

  public static async processStream(event: any): Promise<any[]> {
    const bytes =
      event.data instanceof Uint8ArrayList ? event.data.subarray() : event.data;
    const decoded = new TextDecoder().decode(bytes);
    const utils = new CoreUtils();
    try {
      const objects = await CoreUtils.extractAllJsonObjects(decoded);
      return objects;
    } catch (error) {
      utils.logger.error(
        '[ERROR] Error processing stream event: ',
        error,
        decoded,
      );
      throw error;
    }
  }

  public static async processStreamRequest(event: any): Promise<oRequest[]> {
    const req = await CoreUtils.processStream(event);
    return req.map((req) => new oRequest(req));
  }

  public static async processStreamResponse(event: any): Promise<oResponse[]> {
    const res = await CoreUtils.processStream(event);

    return res.map(
      (response) =>
        new oResponse({
          ...response.result,
        }),
    );
  }

  public static async toCID(data: any): Promise<CID> {
    const bytes = json.encode(data);
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    return cid;
  }
}
