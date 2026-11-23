import { NextRequest, NextResponse } from 'next/server';
import { handleMavenProxyRequest } from '@/lib/maven/mavenProxyHandler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: subPaths } = await params;
    const pathStr = subPaths ? subPaths.join('/') : '';
    return await handleMavenProxyRequest(req, id, pathStr);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: subPaths } = await params;
    const pathStr = subPaths ? subPaths.join('/') : '';
    return await handleMavenProxyRequest(req, id, pathStr);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: subPaths } = await params;
    const pathStr = subPaths ? subPaths.join('/') : '';
    return await handleMavenProxyRequest(req, id, pathStr);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: subPaths } = await params;
    const pathStr = subPaths ? subPaths.join('/') : '';
    return await handleMavenProxyRequest(req, id, pathStr);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Maven proxy error' }, { status: 500 });
  }
}
