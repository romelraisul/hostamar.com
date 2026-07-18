-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "kpiTarget" JSONB NOT NULL,
    "kpiCurrent" JSONB NOT NULL,
    "strategy" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "maxIter" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_slug_key" ON "Goal"("slug");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

