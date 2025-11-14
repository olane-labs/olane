import * as crypto from 'crypto';

// Interface for encrypted data structure
interface EncryptedData {
  encryptedText: string;
  iv: string;
  tag: string;
}

// Configuration interface
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

export class EncryptionService {
  private readonly config: EncryptionConfig;
  private readonly secretKey: Buffer;

  constructor(secretKey?: string) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
    };

    // Generate or use provided secret key
    if (secretKey) {
      this.secretKey = crypto.scryptSync(
        secretKey,
        'salt',
        this.config.keyLength,
      );
    } else {
      this.secretKey = crypto.randomBytes(this.config.keyLength);
    }
  }

  /**
   * Encrypts plain text using AES-256-GCM
   * @param plainText - Text to encrypt
   * @returns Promise<EncryptedData> - Object containing encrypted data, IV, and authentication tag
   */
  public async encrypt(plainText: string): Promise<EncryptedData> {
    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(this.config.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.config.algorithm,
        this.secretKey,
        iv,
      ) as crypto.CipherGCM;

      // Encrypt the text
      let encryptedText = cipher.update(plainText, 'utf8', 'hex');
      encryptedText += cipher.final('hex');

      // Get authentication tag for GCM mode
      const tag = cipher.getAuthTag();

      return {
        encryptedText,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Decrypts encrypted data
   * @param encryptedData - Object containing encrypted text, IV, and tag
   * @returns Promise<string> - Decrypted plain text
   */
  public async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const { encryptedText, iv, tag } = encryptedData;

      // Convert hex strings back to buffers
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(tag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.config.algorithm,
        this.secretKey,
        ivBuffer,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(tagBuffer);

      // Decrypt the text
      let decryptedText = decipher.update(encryptedText, 'hex', 'utf8');
      decryptedText += decipher.final('utf8');

      return decryptedText;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Encrypts and returns base64 encoded string for easy storage
   * @param plainText - Text to encrypt
   * @returns Promise<string> - Base64 encoded encrypted data
   */
  public async encryptToBase64(plainText: string): Promise<string> {
    const encryptedData = await this.encrypt(plainText);
    const combined = JSON.stringify(encryptedData);
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypts from base64 encoded string
   * @param base64Data - Base64 encoded encrypted data
   * @returns Promise<string> - Decrypted plain text
   */
  public async decryptFromBase64(base64Data: string): Promise<string> {
    try {
      const combined = Buffer.from(base64Data, 'base64').toString('utf8');
      const encryptedData: EncryptedData = JSON.parse(combined);
      return await this.decrypt(encryptedData);
    } catch (error) {
      throw new Error(
        `Base64 decryption failed: ${error instanceof Error ? error.message : 'Invalid format'}`,
      );
    }
  }

  /**
   * Generates a new secret key
   * @returns string - Hex encoded secret key
   */
  public static generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
