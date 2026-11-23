import { NextRequest, NextResponse } from 'next/server';
import { handleMavenProxyRequest } from '@/lib/maven/mavenProxyHandler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleMavenProxyRequest(req, id, '');
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleMavenProxyRequest(req, id, '');
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleMavenProxyRequest(req, id, '');
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleMavenProxyRequest(req, id, '');
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}
