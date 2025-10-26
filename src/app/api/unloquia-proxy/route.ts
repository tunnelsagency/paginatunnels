import { NextResponse } from 'next/server';

type IncomingPayload = {
  clientId?: string;
  messageId?: string;
  userId?: string;
  text?: string;
};

const REQUIRED_FIELDS: Array<keyof IncomingPayload> = [
  'clientId',
  'messageId',
  'userId',
  'text',
];

const UPSTREAM_URL = 'https://api.unloquia.com/api/v1/workflows/execute/';

export async function POST(req: Request) {
  const landingSecret = process.env.UNLOQUIA_LANDING_SECRET;

  if (!landingSecret) {
    return NextResponse.json(
      { error: 'Missing UNLOQUIA_LANDING_SECRET environment variable.' },
      { status: 500 },
    );
  }

  let body: IncomingPayload;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid JSON payload.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields.', missing: missingFields },
      { status: 400 },
    );
  }

  const { clientId, messageId, userId, text } = body;

  const timestamp = new Date().toISOString();

  const upstreamPayload = {
    client_id: clientId,
    channel: 'landing',
    message: {
      message_id: messageId,
      direction: 'inbound',
      type: 'text',
      timestamp,
      contact: {
        wa_id: userId,
        profile_name: userId,
      },
      content: {
        text,
      },
      attributes: {
        source: 'landing-widget',
      },
    },
    context: {
      variables: {
        landing_user_id: userId,
        landing_message_id: messageId,
      },
      tenant_scopes: [],
    },
    trace: {
      source: 'landing-widget',
    },
  };

  try {
    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Landing-Secret': landingSecret,
      },
      body: JSON.stringify(upstreamPayload),
    });

    const responseJson = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: 'Upstream request failed.',
          status: upstreamResponse.status,
          details: responseJson,
        },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(responseJson ?? {}, {
      status: upstreamResponse.status,
    });
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
