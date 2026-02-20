import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(data: Buffer | string, key: Buffer): Buffer {
    if (key.length !== 32) {
        throw new Error('Invalid key length: must be 32 bytes');
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(encryptedData: Buffer, key: Buffer): Buffer {
    if (key.length !== 32) {
        throw new Error('Invalid key length: must be 32 bytes');
    }
    if (encryptedData.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error('Invalid encrypted data: too short');
    }
    
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const tag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = encryptedData.subarray(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    try {
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (err: any) {
        throw new Error(`Decryption failed: ${err.message}`);
    }
}

export function deriveKey(password: string, salt: string): Buffer {
    // Improved secure key derivation using scrypt with production-grade parameters
    return crypto.scryptSync(password, salt, 32, {
        N: 131072, // Cost factor: 2^17 (128MB RAM)
        r: 8,      // Block size
        p: 1,      // Parallelization factor
        maxmem: 256 * 1024 * 1024 // 256MB limit
    });
}
