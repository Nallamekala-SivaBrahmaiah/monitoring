import { NextRequest } from 'next/server';
import { handleMavenProxyRequest } from '@/lib/maven/mavenProxyHandler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: subPaths } = await params;
  const pathStr = subPaths ? subPaths.join('/') : '';
  return handleMavenProxyRequest(req, id, pathStr);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: subPaths } = await params;
  const pathStr = subPaths ? subPaths.join('/') : '';
  return handleMavenProxyRequest(req, id, pathStr);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: subPaths } = await params;
  const pathStr = subPaths ? subPaths.join('/') : '';
  return handleMavenProxyRequest(req, id, pathStr);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: subPaths } = await params;
  const pathStr = subPaths ? subPaths.join('/') : '';
  return handleMavenProxyRequest(req, id, pathStr);
}
