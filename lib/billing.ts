export const billing = {
  bKash: (amount: number) => `https://hostamar.com/billing/bkash?amount=${amount}`,
  stripe: (amount: number) => `https://hostamar.com/billing/stripe?amount=${amount}`,
  medusa: { checkout: '/api/medusa/checkout' },
}
export const prices = {
  agentCloud: { usd: 49, bdt: 5400 },
  videoOS: { usd: 0.10, bdt: 12, per: 'minute' },
  gpuSpot: { rtx4090: { usd: 0.20, bdt: 22 }, h100: { usd: 1.5, bdt: 165 } },
}
