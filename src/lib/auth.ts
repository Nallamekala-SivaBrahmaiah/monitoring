import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb';
import User, { hashPassword, IUser } from '@/models/User';

export const AUTH_COOKIE_NAME = 'auth_session';

const AUTH_SECRET = process.env.AUTH_SECRET || 'multi-cloud-monitoring-secret-key-2026';

export interface AuthSessionPayload {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

/**
 * Creates a signed session token.
 */
export function signSessionToken(payload: Omit<AuthSessionPayload, 'exp'>, expiresInHours = 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const fullPayload: AuthSessionPayload = { ...payload, exp };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 */
export function verifySessionToken(token?: string | null): AuthSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');

  try {
    const isSigValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isSigValid) return null;

    const payload: AuthSessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Seeds or synchronizes the administrator user monitoring365@gmail.com.
 */
export async function ensureDefaultAdminUser(): Promise<void> {
  try {
    await connectToDatabase();
    
    // Remove old default admin credentials
    await User.deleteMany({ username: { $in: ['admin', 'siva'] } });

    // Ensure monitoring365 user exists
    const existing = await User.findOne({
      $or: [
        { username: 'monitoring365@gmail.com' },
        { email: 'monitoring365@gmail.com' },
        { username: 'monitoring365' },
      ],
    });

    if (!existing) {
      console.log('[Auth] Creating user monitoring365@gmail.com in MongoDB...');
      const { salt, hash } = hashPassword('monitoring365');
      await User.create({
        username: 'monitoring365@gmail.com',
        email: 'monitoring365@gmail.com',
        name: 'Siva Brahmaiah',
        role: 'Admin',
        passwordHash: hash,
        salt,
      });
      console.log('[Auth] User monitoring365@gmail.com created successfully.');
    } else {
      // Ensure password is synchronized to monitoring365
      const { salt, hash } = hashPassword('monitoring365');
      existing.passwordHash = hash;
      existing.salt = salt;
      existing.email = 'monitoring365@gmail.com';
      await existing.save();
    }
  } catch (err) {
    console.warn('[Auth] Note during user initialization:', err);
  }
}

