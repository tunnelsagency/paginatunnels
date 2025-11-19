import { NextResponse } from 'next/server';

const UPSTREAM_URL = 'https://api.unloquia.com/api/v1/landing/messages/';

export async function GET(req: Request) {
  const landingSecret = process.env.UNLOQUIA_LANDING_SECRET;

  if (!landingSecret) {
    return NextResponse.json(
      { error: 'Missing UNLOQUIA_LANDING_SECRET environment variable.' },
      { status: 500 },
    );
  }

  const currentUrl = new URL(req.url);
  const clientId = currentUrl.searchParams.get('clientId');
  const sessionId = currentUrl.searchParams.get('sessionId');
  const since = currentUrl.searchParams.get('since');
  const limit = currentUrl.searchParams.get('limit') ?? '50';

  if (!clientId || !sessionId) {
    return NextResponse.json(
      { error: 'Missing clientId or sessionId query parameter.' },
      { status: 400 },
    );
  }

  const upstreamUrl = new URL(UPSTREAM_URL);
  upstreamUrl.searchParams.set('client_id', clientId);
  upstreamUrl.searchParams.set('session_id', sessionId);
  upstreamUrl.searchParams.set('limit', limit);
  if (since) {
    upstreamUrl.searchParams.set('since', since);
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: { 'X-Landing-Secret': landingSecret },
      cache: 'no-store',
    });

    if (upstreamResponse.status === 404) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const payload = await upstreamResponse.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstreamResponse.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reach Unloquia API.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
