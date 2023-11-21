// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://309deaceeda5deea8424738dd3f75b46@o4505774316060672.ingest.sentry.io/4505774317109248',
  enabled: process.env.NODE_ENV !== 'development',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend: (event, hint) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(hint.originalException || hint.syntheticException);
      return null; // this drops the event and nothing will be sent to sentry
    }
    return event;
  },

  replaysOnErrorSampleRate: 0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    new Sentry.Replay({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
