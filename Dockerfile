# =============================================================================
# Hostamar — Multi-stage Dockerfile for VPS Deployment
# =============================================================================

# Stage 1: Install dependencies
# =============================================================================
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# =============================================================================
# Stage 2: Build Next.js app + compile worker
# =============================================================================
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PRIVATE_STANDALONE=1

# Generate Prisma client first, then build Next.js
ENV DATABASE_URL=postgresql://dummy:***@localhost:5432/dummy
RUN npx prisma generate
RUN npm run build

# Build the BullMQ worker
RUN npm install -g tsup typescript 2>/dev/null; npm install @aws-sdk/s3-request-presigner execa 2>/dev/null; mkdir -p dist/workers; npx tsup workers/video-generation.ts     --out-dir dist/workers     --format cjs     --external @prisma/client     --clean 2>&1 | tee /tmp/worker-build.log && echo "Worker built" || echo "Worker build FAILED"

# =============================================================================
# Stage 3: Production runner (minimal image)
# =============================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# ffmpeg is required by the video-generation worker
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone output (includes traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static
# Copy public folder to standalone for static file serving (favicon, images, etc.)
COPY --from=builder /app/public ./.next/standalone/public

# Prisma: copy schema + generate client in standalone node_modules
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma 2>/dev/null || true

# Symlink node_modules to standalone location so worker can find @prisma/client
RUN if [ -d ".next/standalone/node_modules/@prisma" ]; then \
      ln -sf .next/standalone/node_modules node_modules; \
    fi

# Copy package.json for informational purposes
COPY --from=builder /app/package.json ./

# Copy full node_modules for worker dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled worker if present
COPY --from=builder /app/dist ./dist

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default: run the Next.js standalone server
# Override CMD for the worker service: node dist/workers/video-generation.js
CMD ["node", ".next/standalone/server.js"]
