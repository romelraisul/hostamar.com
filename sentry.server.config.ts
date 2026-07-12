// Sentry server config — INTENTIONALLY DISABLED.
// @sentry/nextjs build-time instrumentation injects `Html` from
// next/document into Next's internal /404 and /500 Pages-Router
// fallback pages, which crashes Vercel's static prerender with
// "<Html> should not be imported outside of pages/_document".
// This file is kept as a no-op so runtime Sentry (if re-enabled) has
// a config entry point, but no build-time wrapper is applied.
export {}
