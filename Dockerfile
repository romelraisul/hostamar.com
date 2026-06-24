# Base Next.js Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG STRIPE_SECRET_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
# Harden: bake NEXTAUTH values at build time when supplied via --build-arg.
# If not supplied, the image keeps the existing runtime-only behavior (env_file).
ARG NEXTAUTH_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy video proxy server and patch server.js to start it alongside Next.js
COPY --chown=nextjs:nodejs video-server.js ./video-server.js
COPY --chown=nextjs:nodejs scripts/patch-server.js ./patch-server.js
RUN mkdir -p /app/videos && chown nextjs:nodejs /app/videos
RUN node patch-server.js && rm patch-server.js

# Prisma native engine + generated client — required because standalone
# output's static-trace-based tree-shaking cannot follow Prisma's runtime
# `loadLibrary()` call. Without these copies the engine .node file is
# missing and you get "libssl.so.1.1: no such file or directory".
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# bcryptjs is not traced by Next.js standalone output — copy explicitly
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
