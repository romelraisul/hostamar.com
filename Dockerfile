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

# Generate Prisma client first, then build Next.js
# DATABASE_URL can be a dummy for prisma generate (only needs schema)
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
RUN npm run build

# Build the BullMQ worker (optional - will be skipped if tsup unavailable)
RUN npm install -g tsup 2>/dev/null; mkdir -p dist/workers; tsup workers/video-generation.ts \
    --out-dir dist/workers \
    --format cjs \
    --external @prisma/client \
    --clean 2>/dev/null && echo "Worker built" || echo "Worker build skipped (runtime only)"

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

# Copy package.json for informational purposes
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default: run the Next.js standalone server
# Override CMD for the worker service: node dist/workers/video-generation.js
CMD ["node", "server.js"]
