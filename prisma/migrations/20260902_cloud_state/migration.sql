-- V31 PC-as-Cloud tracker singleton table (idempotent — deploy applies via psql/prisma db execute)
CREATE TABLE IF NOT EXISTS "CloudState" (
    "id" TEXT NOT NULL DEFAULT 'pc',
    "pcOn" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pcUptimeSec" INTEGER NOT NULL DEFAULT 0,
    "gpu" JSONB,
    "tailscaleIp" TEXT,
    "services" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CloudState_pkey" PRIMARY KEY ("id")
);
