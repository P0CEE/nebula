// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// Only import and initialize Sentry in production

const Sentry = require("@sentry/nextjs");

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Enable logs
  enableLogs: true,

  // Disable debug
  debug: false,
});

const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export { onRouterTransitionStart };
