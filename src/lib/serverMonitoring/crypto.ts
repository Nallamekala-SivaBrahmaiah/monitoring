import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || process.env.APP_SECRET || 'multi-cloud-monitoring-master-sec-key-2026';
  return crypto.createHash('sha256').update(envKey).digest();
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt a secret (e.g. SSH private key or password) using AES-256-GCM
 */
export function encryptSecret(plainText: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt a secret using AES-256-GCM
 */
export function decryptSecret(data: { encrypted: string; iv: string; tag: string }): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(data.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a cryptographically secure random token for server agent registration
 */
export function generateAgentToken(): string {
  return 'agt_' + crypto.randomBytes(24).toString('hex');
}
