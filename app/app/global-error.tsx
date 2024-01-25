'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* This is the default Next.js error component but it doesn't allow omitting the statusCode property yet. */}

        <Error
          statusCode={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            undefined as any
          }
        />
      </body>
    </html>
  );
}
