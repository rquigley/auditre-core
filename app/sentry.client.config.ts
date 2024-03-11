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

  replaysSessionSampleRate: 0,

  // integrations: [
  //   Sentry.replayIntegration({
  //     // Additional Replay configuration goes in here, for example:
  //     maskAllText: true,
  //     blockAllMedia: true,
  //   }),
  // ],
});
