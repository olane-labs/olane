import { generateKeyPair, PeerId } from '@olane/o-config';

export class EncryptionUtil {
  constructor(private readonly privateKey: any) {}

  async genKeyPair(peerId: PeerId): Promise<any> {
    const keyPair = await generateKeyPair('RSA', 2048);
    return keyPair;
  }

  // Encrypt data for a specific peer
  static async encryptForPeer(publicKey: any, data: string) {
    try {
      // Convert data to bytes if needed
      const dataBytes =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;

      // Encrypt using the peer's public key
      // TODO: fix the encryption flow
      const encrypted = await publicKey.encrypt(dataBytes);

      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt data with own private key
  static async decryptData(privateKey: any, encryptedData: any) {
    try {
      const decrypted = await privateKey.decrypt(encryptedData.encrypted);
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}
