import { prisma } from "@/lib/prisma";

export async function ensureTrial(userId: string) {
  // Check if trial already exists
  const existing = await prisma.trial.findUnique({
    where: { customerId: userId },
  });

  if (existing) {
    return existing;
  }

  // Create 14-day trial
  const startedAt = new Date();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  return prisma.trial.create({
    data: {
      customerId: userId,
      startedAt,
      expiresAt,
      status: "ACTIVE",
    },
  });
}