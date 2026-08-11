import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const targetPath = params.path.join('/');
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/${targetPath}${url.search}`;

  try {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? `Gagal meneruskan request ke backend: ${error.message}`
            : 'Gagal meneruskan request ke backend.',
        backend_url: BACKEND_URL,
        path: targetPath,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
