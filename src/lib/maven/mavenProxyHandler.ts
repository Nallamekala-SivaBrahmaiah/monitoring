import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenApp from '@/models/MavenApp';

export async function handleMavenProxyRequest(
  req: NextRequest,
  appId: string,
  subPath: string = ''
): Promise<NextResponse> {
  await connectToDatabase();
  const app = await MavenApp.findById(appId);

  if (!app) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#0B1120;color:#f87171;padding:40px;text-align:center;">
        <h2>Application Not Found</h2>
        <p>The requested application ID does not exist.</p>
        <a href="/dashboard/maven" style="color:#60a5fa;">Back to Maven Dashboard</a>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (app.status !== 'RUNNING' && app.status !== 'STARTING') {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#0B1120;color:#f87171;padding:40px;text-align:center;">
        <h2>Application is ${app.status}</h2>
        <p>Application "${app.projectName}" on port ${app.port} is currently not running.</p>
        <p><a href="/dashboard/maven" style="color:#60a5fa;">Go to Maven Dashboard to Start Application</a></p>
      </body></html>`,
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const targetPort = app.port;
  const searchParams = req.nextUrl.search;
  const cleanSubPath = subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '/';
  const targetUrl = `http://127.0.0.1:${targetPort}${cleanSubPath}${searchParams}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    // Skip host and connection headers that shouldn't be forwarded directly
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection' && lower !== 'transfer-encoding') {
      forwardHeaders.set(key, val);
    }
  });

  forwardHeaders.set('host', `127.0.0.1:${targetPort}`);
  forwardHeaders.set('x-forwarded-host', req.headers.get('host') || 'localhost:3000');
  forwardHeaders.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));
  forwardHeaders.set('x-forwarded-prefix', `/api/maven/apps/${appId}/proxy`);

  try {
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const arrayBuffer = await req.arrayBuffer();
      body = Buffer.from(arrayBuffer);
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding') {
        if (lower === 'location') {
          // Rewrite internal redirects so browser stays within the proxy
          let location = val;
          if (location.startsWith(`http://127.0.0.1:${targetPort}`)) {
            location = location.replace(`http://127.0.0.1:${targetPort}`, `/api/maven/apps/${appId}/proxy`);
          } else if (location.startsWith('/')) {
            location = `/api/maven/apps/${appId}/proxy${location}`;
          }
          responseHeaders.set(key, location);
        } else {
          responseHeaders.set(key, val);
        }
      }
    });

    const contentType = upstreamResponse.headers.get('content-type') || '';

    // If it's an HTML page, inject <base> so relative resources (css, js, images) resolve through proxy
    if (contentType.includes('text/html')) {
      let html = await upstreamResponse.text();
      const baseTag = `<base href="/api/maven/apps/${appId}/proxy/" />`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n  ${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n  ${baseTag}`);
      }
      return new NextResponse(html, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    }

    // Binary / stream response
    const arrayBuffer = await upstreamResponse.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`[MavenProxy] Failed to proxy to ${targetUrl}:`, err.message);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#0B1120;color:#f87171;padding:40px;text-align:center;">
        <h2>Unable to Connect to Application</h2>
        <p>The application on port ${targetPort} is still starting up or not accepting connections yet.</p>
        <p style="color:#94a3b8;font-size:12px;">Error: ${err.message}</p>
        <button onclick="window.location.reload()" style="background:#2563eb;color:white;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;margin-top:12px;">Retry</button>
      </body></html>`,
      { status: 502, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

