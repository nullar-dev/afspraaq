import { NextResponse } from 'next/server';

const hasAllowedOriginsConfig = () => {
  if (process.env.NODE_ENV !== 'production') return true;
  return !!process.env.ALLOWED_ORIGINS?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean).length;
};

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        allowedOriginsConfigured: hasAllowedOriginsConfig(),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
