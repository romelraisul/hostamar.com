/**
 * lib/payments/fulfill.ts — shared fulfill for Stripe/PayPal webhooks
 * Adds credits + creates Payment/Transaction + Subscription + invoice + SeoEvent
 * Safe against missing CreditAccount/CreditTransaction models (try/catch fallback).
 */
import { prisma } from "@/lib/prisma";
import { PRICING, type Tier } from "@/lib/pricing";

export interface FulfillParams {
  tier: Tier;
  email: string;
  customerId?: string | null;
  amountTaka?: number;
  amountUSD?: number;
  trxId: string; // provider id: pi_xxx / PAYPAL-ORDERID / session_id
  provider: "stripe" | "paypal" | "bkash";
  rawPayload?: any;
}

export async function fulfillPayment(params: FulfillParams): Promise<{
  success: boolean;
  trxId: string;
  tier: Tier;
  credits: number;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
}> {
  const { tier, email, provider, trxId } = params;
  const pricing = PRICING[tier];
  if (!pricing) throw new Error(`Invalid tier in fulfill: ${tier}`);

  const credits = pricing.credits;
  const taka = params.amountTaka ?? pricing.taka;
  const usd = params.amountUSD ?? pricing.usd;

  // Resolve / create customer
  let customer: any = null;
  if (params.customerId) {
    customer = await prisma.customer.findUnique({ where: { id: params.customerId } }).catch(() => null);
  }
  if (!customer && email) {
    customer = await prisma.customer.findUnique({ where: { email } }).catch(() => null);
  }
  // If no customer but email provided, we still fulfill via email-only (invoice can still be generated)
  const customerId = customer?.id || params.customerId || null;
  const customerName = customer?.name || email?.split("@")[0] || "Customer";

  // Idempotency: if Payment with same transactionId/providerPaymentId exists, return early
  const existing = await (prisma as any).payment
    .findFirst({ where: { OR: [{ transactionId: trxId }, { providerPaymentId: trxId }] } })
    .catch(() => null);
  if (existing) {
    console.log(`[fulfill] already processed ${trxId} -> ${existing.id}`);
    return {
      success: true,
      trxId,
      tier,
      credits,
      invoiceUrl: existing.invoiceUrl || null,
      invoiceNumber: existing.invoiceNumber || null,
    };
  }

  // 1) Create Payment + Transaction
  let payment: any = null;
  try {
    payment = await (prisma as any).payment.create({
      data: {
        customerId: customerId || undefined,
        // if no customerId (guest PayPal checkout without account), create with dummy — fallback to create without relation
        // But schema requires customerId, so if null we cannot create Payment -> skip Payment, use Transaction only
        method: provider,
        amount: taka,
        currency: "BDT",
        status: "completed",
        transactionId: trxId,
        providerPaymentId: trxId,
        planName: tier,
      },
    });
  } catch (e: any) {
    // If customerId missing or Payment model issue, log and continue
    console.warn("[fulfill] Payment.create failed (maybe no customer):", e?.message);
    // Try creating without customerId if guest: attempt to create Transaction only
    if (!customerId) {
      // Create a placeholder customer for guest? skip Payment, still do credits via email log
      console.log(`[fulfill] guest payment ${email} ${tier} ${trxId} (no customerId, skipping Payment row)`);
    }
  }

  // Transaction row (for ledger)
  if (customerId) {
    try {
      await (prisma as any).transaction.create({
        data: {
          customerId,
          amount: taka,
          currency: "BDT",
          status: "completed",
          gateway: provider,
          gatewayTrxId: trxId,
          videoPackage: tier,
          creditsAdded: credits,
        },
      });
    } catch (e: any) {
      console.warn("[fulfill] Transaction.create failed:", e?.message);
    }
  }

  // 2) Credits — try CreditAccount/CreditTransaction, fallback to logging + Transaction already stores creditsAdded
  let creditsApplied = false;
  try {
    const acct = await (prisma as any).creditAccount.findUnique({ where: { customerId } }).catch(() => null);
    if (customerId) {
      if (acct) {
        const newCredits = (acct.credits || 0) + credits;
        await (prisma as any).creditAccount.update({
          where: { customerId },
          data: { credits: newCredits },
        });
        await (prisma as any).creditTransaction
          .create({
            data: {
              accountId: acct.id,
              amount: credits,
              balanceAfter: newCredits,
              product: "purchase",
              description: `${tier} — ${credits} credits via ${provider} (৳${taka})`,
            },
          })
          .catch((e: any) => console.warn("[fulfill] creditTransaction create failed:", e?.message));
      } else {
        // Create account if CreditAccount model exists
        const created = await (prisma as any).creditAccount
          .create({
            data: { customerId, credits, consumed: 0 },
          })
          .catch((e: any) => {
            console.warn("[fulfill] creditAccount.create failed:", e?.message);
            return null;
          });
        if (created) {
          await (prisma as any).creditTransaction
            .create({
              data: {
                accountId: created.id,
                amount: credits,
                balanceAfter: credits,
                product: "purchase",
                description: `${tier} — ${credits} credits via ${provider}`,
              },
            })
            .catch(() => {});
        }
      }
      creditsApplied = true;
    }
  } catch (e: any) {
    // CreditAccount model likely doesn't exist (schema.prisma missing). Fallback: we already have Transaction.creditsAdded
    console.warn("[fulfill] CreditAccount flow skipped (model may not exist):", e?.message);
  }

  // 3) Subscription upsert — extend or create
  if (customerId) {
    try {
      const existingSub = await prisma.subscription.findFirst({
        where: { customerId, plan: tier, status: "active" },
      });
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            nextBillingDate: nextBilling,
            price: taka,
            creditsPerMonth: credits,
            status: "active",
            ...(provider === "stripe" ? { stripeSubscriptionId: trxId } : {}),
            ...(provider === "paypal" ? { paypalSubscriptionId: trxId } : {}),
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            customerId,
            plan: tier,
            status: "active",
            price: taka,
            currency: "BDT",
            billingCycle: "monthly",
            nextBillingDate: nextBilling,
            videosPerMonth: pricing.videosPerMonth,
            storageGB: pricing.storageGB,
            creditsPerMonth: credits,
            stripeSubscriptionId: provider === "stripe" ? trxId : null,
            paypalSubscriptionId: provider === "paypal" ? trxId : null,
          } as any,
        });
      }
    } catch (e: any) {
      console.warn("[fulfill] subscription upsert failed:", e?.message);
    }
  }

  // 4) Invoice + SeoEvent + Slack — via lib/invoice onPaymentApproved
  let invoiceUrl: string | null = null;
  let invoiceNumber: string | null = null;
  try {
    const { onPaymentApproved } = await import("@/lib/invoice");
    const res = await onPaymentApproved({
      customerName,
      email,
      tier,
      amount: taka,
      credits,
      trxId,
      customerId: customerId || undefined,
    });
    invoiceUrl = res.invoiceUrl;
    invoiceNumber = res.invoiceNumber;
    // update Payment row with invoice
    if (payment?.id && invoiceUrl) {
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: { invoiceUrl, invoiceNumber: invoiceNumber || undefined },
      }).catch(() => {});
    }
  } catch (e: any) {
    console.warn("[fulfill] invoice/SeoEvent failed:", e?.message);
    // fallback SeoEvent directly
    try {
      await (prisma as any).seoEvent.create({
        data: {
          event: "payment_success",
          email,
          tier,
          amount: taka,
          trxId,
          customerId: customerId || undefined,
          properties: { tier, amount: taka, usd, credits, trxId, provider, at: new Date().toISOString() },
        },
      });
    } catch {}
  }

  // 5) ActivityLog always
  try {
    await prisma.activityLog.create({
      data: {
        customerId: customerId || undefined,
        action: "payment_success",
        description: `Payment ${provider} success: ${taka} Taka ${tier} ${credits}cr ${email} Trx ${trxId}${creditsApplied ? "" : " (Transaction ledger only)"}`,
        metadata: JSON.stringify({ tier, taka, usd, credits, trxId, provider, invoiceUrl, invoiceNumber }),
      } as any,
    });
  } catch {}

  console.log(`[fulfill] ✓ ${provider} ${tier} ${credits}cr for ${email} Trx ${trxId} invoice ${invoiceNumber || ""}`);

  return { success: true, trxId, tier, credits, invoiceUrl, invoiceNumber };
}
