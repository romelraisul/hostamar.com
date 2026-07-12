// Sentry edge config — INTENTIONALLY DISABLED (see sentry.server.config.ts
// for the reason: @sentry/nextjs build-time instrumentation crashes the
// Vercel /404 //500 prerender via an injected `Html` import).
export {}
