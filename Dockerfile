# =============================================================================
# Hostamar — Multi-stage Dockerfile for VPS Deployment
# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# =============================================================================
# Stage 2: Build Next.js app + compile worker
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Enable standalone output (next.config.js doesn't set output: 'standalone')
ENV NEXT_PRIVATE_STANDALONE=1

# Build Next.js (standalone output: .next/standalone/)
RUN npx next build

# Build the BullMQ worker into a standalone JS bundle
# tsup resolves @/ path aliases and bundles all internal deps
# @prisma/client is kept external (needs native Prisma query engine binary)
# execa is bundled (only used by worker, not in standalone trace)
RUN npm install -g tsup
RUN tsup workers/video-generation.ts \
    --out-dir dist/workers \
    --format cjs \
    --external @prisma/client \
    --clean

# =============================================================================
# Stage 3: Production runner (minimal image)
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# ffmpeg is required by the video-generation worker
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone output (includes traced node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: copy schema + generate client in standalone node_modules
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma 2>/dev/null || true

# Symlink node_modules to standalone location so worker can find @prisma/client
RUN if [ -d ".next/standalone/node_modules/@prisma" ]; then \
      ln -sf .next/standalone/node_modules node_modules; \
    fi

# Copy compiled worker bundle
COPY --from=builder /app/dist ./dist

# Copy package.json for informational purposes
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default: run the Next.js standalone server
# Override CMD for the worker service: node dist/workers/video-generation.js
CMD ["node", "server.js"]
