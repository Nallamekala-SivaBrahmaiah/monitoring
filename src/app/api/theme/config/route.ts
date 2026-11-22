import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ThemeConfig from '@/models/ThemeConfig';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

function getUserIdFromRequest(request: NextRequest): string {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);
    return session?.email || session?.username || 'global_admin';
  } catch {
    return 'global_admin';
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);

    const saved = await ThemeConfig.findOne({ userId }).sort({ updatedAt: -1 });

    if (!saved) {
      return NextResponse.json({
        success: true,
        isCustom: false,
        config: null,
      });
    }

    return NextResponse.json({
      success: true,
      isCustom: true,
      name: saved.name,
      config: saved.config,
      updatedAt: saved.updatedAt,
    });
  } catch (error: any) {
    console.error('Error fetching theme configuration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch theme configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);

    const body = await request.json();
    const { name = 'Custom Theme', config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Valid theme config object is required' },
        { status: 400 }
      );
    }

    const saved = await ThemeConfig.findOneAndUpdate(
      { userId },
      {
        userId,
        name,
        isDefault: false,
        config,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Theme saved successfully in database',
      themeId: saved._id,
      name: saved.name,
      updatedAt: saved.updatedAt,
    });
  } catch (error: any) {
    console.error('Error saving theme configuration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save theme configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);

    await ThemeConfig.deleteMany({ userId });

    return NextResponse.json({
      success: true,
      message: 'Theme reset to default successfully',
    });
  } catch (error: any) {
    console.error('Error resetting theme configuration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset theme configuration' },
      { status: 500 }
    );
  }
}
