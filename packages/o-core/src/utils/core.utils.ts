import {
  generateKeyPairFromSeed,
  createEd25519PeerId,
  Stream,
  Uint8ArrayList,
  pushable,
} from '@olane/o-config';
import { createHash } from 'crypto';
import { oAddress } from '../router/o-address.js';
import { oResponse } from '../lib/o-response.js';
import { oRequest } from '../lib/o-request.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';

export class CoreUtils {
  static async generatePeerId(): Promise<any> {
    const peerId = await createEd25519PeerId();
    return peerId;
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

    const responseStream = pushable();
    responseStream.push(new TextEncoder().encode(response.toString()));
    responseStream.end();
    return await stream.sink(responseStream);
  }

  public static async processStream(stream: any): Promise<oRequest> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream.source) {
      chunks.push(chunk.subarray());
    }

    const data = new Uint8ArrayList(...chunks).slice();
    if (!data || data.length === 0) {
      throw new Error('No data received');
    }
    return new oRequest(JSON.parse(new TextDecoder().decode(data)));
  }

  public static async toCID(data: any): Promise<CID> {
    const bytes = json.encode(data);
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    return cid;
  }
}
