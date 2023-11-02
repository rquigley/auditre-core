import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

import { db, shuttingDown } from '@/lib/db';

export async function GET(request: Request) {
  if (!shuttingDown) {
    try {
      await db.selectFrom('org').limit(1).execute();
    } catch (e) {
      Sentry.captureException(e);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
