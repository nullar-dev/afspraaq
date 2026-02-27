import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export async function POST() {
  const code = `GC-${randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  return NextResponse.json({ code });
}
