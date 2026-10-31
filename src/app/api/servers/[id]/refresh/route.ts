import { NextRequest, NextResponse } from 'next/server';
import { syncSingleServer } from '@/lib/serverMonitoring/serverSync';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/servers/[id]/refresh
 * Immediately trigger SSH polling and metrics reconciliation for this server.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const updated = await syncSingleServer(id);

    if (!updated) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const sanitized = updated.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      message: 'Server metrics synchronized successfully',
      server: sanitized,
    });
  } catch (err: any) {
    console.error('Server refresh error:', err);
    return NextResponse.json(
      {
        error: `Synchronization failed: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
