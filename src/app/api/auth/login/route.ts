import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import {
  AUTH_COOKIE_NAME,
  signSessionToken,
  ensureDefaultAdminUser,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    await ensureDefaultAdminUser();

    const body = await request.json().catch(() => ({}));
    const identifier = (body.identifier || body.username || body.email || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please enter both username/email and password.' },
        { status: 400 }
      );
    }

    // Search user by username OR email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password.' },
        { status: 401 }
      );
    }

    const isValid = user.verifyPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username/email or password.' },
        { status: 401 }
      );
    }

    // Generate signed session token
    const token = signSessionToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectTo: '/',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('[Auth API] Login error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}

