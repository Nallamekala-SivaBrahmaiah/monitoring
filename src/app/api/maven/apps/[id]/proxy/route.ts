import { NextRequest } from 'next/server';
import { handleMavenProxyRequest } from '@/lib/maven/mavenProxyHandler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMavenProxyRequest(req, id, '');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMavenProxyRequest(req, id, '');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMavenProxyRequest(req, id, '');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMavenProxyRequest(req, id, '');
}
