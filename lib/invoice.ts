/**
 * Hostamar Invoice PDF — Bangla + SeoEvent + Slack
 * Uses jsPDF with Noto Sans Bengali fallback, green header #0E7C3A
 */
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// ---- Types ----
export interface GenerateInvoiceParams {
  customerName: string;
  email: string;
  tier: string;
  amount: number; // Taka
  credits: number;
  trxId: string;
  invoiceNumber?: string;
  date?: string | Date;
  id?: string; // optional override for file id
  customerId?: string; // for SeoEvent linking
}

const GREEN = "#0E7C3A";
const BIN = process.env.HOSTAMAR_BIN || process.env.BIN_NUMBER || "BIN: 123456789-0001";
const COMPANY_NAME = "Hostamar";
const COMPANY_TAGLINE = "Cloud Hosting + AI Video Marketing";
const COMPANY_ADDRESS = "Dhaka, Bangladesh | support@hostamar.com | https://hostamar.com";
const FOOTER_BN = "ধন্যবাদ — Hostamar-এর সাথে থাকার জন্য!";
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || "https://hostamar.com";

// ---- Helpers ----
function formatDate(d?: string | Date): string {
  const date = d ? new Date(d) : new Date();
  // Use en-BD for ASCII, but keep Bangla variant for display
  return date.toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });
}
function formatDateShort(d?: string | Date): string {
  const date = d ? new Date(d) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}
function safeId(): string {
  // cuid-like fallback
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function sanitizeInvoiceNumber(inv: string): string {
  return inv.replace(/[^a-zA-Z0-9-_]/g, "_");
}

// ---- Font loader ----
let cachedFontBase64: string | null = null;
function loadNotoBengaliBase64(): string | null {
  if (cachedFontBase64) return cachedFontBase64;
  const candidates = [
    path.join(process.cwd(), "public", "NotoSansBengali.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansBengali.ttf"),
    "/mnt/c/Users/User/NotoSansBengali.ttf",
    path.join(process.cwd(), "..", "public", "NotoSansBengali.ttf"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedFontBase64 = buf.toString("base64");
        return cachedFontBase64;
      }
    } catch {}
  }
  return null;
}

// ---- Core: generate PDF buffer with jsPDF ----
async function buildPdfBuffer(params: GenerateInvoiceParams, invoiceNumber: string, dateStr: string): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Try to embed Noto Sans Bengali for Bangla rendering
  let fontFamily = "helvetica";
  try {
    const b64 = loadNotoBengaliBase64();
    if (b64) {
      doc.addFileToVFS("NotoSansBengali.ttf", b64);
      doc.addFont("NotoSansBengali.ttf", "NotoBengali", "normal");
      fontFamily = "NotoBengali";
    }
  } catch (e) {
    console.warn("[invoice] font embed failed, fallback to helvetica:", (e as Error).message);
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header bar green #0E7C3A
  doc.setFillColor(14, 124, 58); // #0E7C3A
  doc.rect(0, 0, pageW, 28, "F");

  // Header text - Hostamar logo (text)
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(COMPANY_NAME, 14, 14);
  doc.setFontSize(9);
  doc.text(COMPANY_TAGLINE, 14, 20);
  doc.setFontSize(7);
  doc.text(COMPANY_ADDRESS, 14, 24);

  // Header right - Invoice meta
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  // Right align
  doc.text(`Invoice: ${invoiceNumber}`, pageW - 14, 12, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Tarikh: ${dateStr}`, pageW - 14, 17, { align: "right" });
  doc.text(BIN, pageW - 14, 22, { align: "right" });

  // Body
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  let y = 38;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Bill To /", 14, y);
  // Bangla label with fallback — if Noto not loaded, Bangla may show boxes but we keep it
  try {
    doc.text("বিল প্রাপক", 28, y);
  } catch {}
  y += 5;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(12);
  doc.setFont(fontFamily, "normal");
  doc.text(params.customerName || "Valued Customer", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(params.email, 14, y);
  y += 10;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, pageW - 14, y);
  y += 8;

  // Table header
  doc.setFillColor(240, 248, 240); // light green tint
  doc.rect(14, y, pageW - 28, 10, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("BIBORON / DESCRIPTION", 16, y + 6);
  doc.text("PORIMAN / AMOUNT", pageW - 16, y + 6, { align: "right" });
  y += 14;

  // Table rows
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);

  const rows: Array<[string, string]> = [
    [`Plan / Tier: ${params.tier}`, ""],
    [`Credits: ${params.credits.toLocaleString()} credits`, ""],
    [`TrxID: ${params.trxId}`, ""],
    [`Invoice: ${invoiceNumber}`, ""],
  ];

  for (const [label, val] of rows) {
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(label, 16, y);
    if (val) {
      doc.setTextColor(20, 20, 20);
      doc.text(val, pageW - 16, y, { align: "right" });
    }
    y += 7;
  }

  // Amount highlight
  y += 2;
  doc.setDrawColor(14, 124, 58);
  doc.line(14, y, pageW - 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(14, 124, 58);
  doc.text("Moat / Total Payable", 16, y);
  doc.setFontSize(14);
  doc.text(`${Number(params.amount).toLocaleString()} Taka`, pageW - 16, y, { align: "right" });
  // Bangla amount line
  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  try {
    doc.text(`পরিমাণ: ${Number(params.amount).toLocaleString()} টাকা`, 16, y);
  } catch {
    doc.text(`Amount: ${Number(params.amount).toLocaleString()} Taka`, 16, y);
  }

  // Payment info
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Payment Method: bKash / Stripe / PayPal  |  Transaction: ${params.trxId}`, 14, y);
  y += 5;
  doc.text(`Tier: ${params.tier}  |  Credits: ${params.credits}`, 14, y);

  // Footer
  const footerY = pageH - 18;
  doc.setFillColor(14, 124, 58);
  doc.rect(0, footerY, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(fontFamily, "normal");
  try {
    doc.text(FOOTER_BN, pageW / 2, footerY + 8, { align: "center" });
  } catch {
    doc.text("Dhonnobad - Hostamar er sathe thakar jonno!", pageW / 2, footerY + 8, { align: "center" });
  }
  doc.setFontSize(7);
  doc.text("Ei roshidti swayangkriyobhabe toiri kora hoyeche. | This is a computer generated invoice.", pageW / 2, footerY + 13, { align: "center" });

  // Watermark light
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(48);
  // rotate watermark
  try {
    // @ts-ignore - jsPDF text options may support angle
    doc.text("HOSTAMAR", pageW / 2, pageH / 2, { align: "center", angle: 30 });
  } catch {}

  const arrayBuf = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuf);
}

// ---- Save to public + try S3 ----
async function saveInvoiceFile(buffer: Buffer, fileName: string): Promise<{ filePath: string; publicUrl: string }> {
  const invoicesDir = path.join(process.cwd(), "public", "invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
  const filePath = path.join(invoicesDir, fileName);
  fs.writeFileSync(filePath, buffer);
  const publicUrl = `${PUBLIC_BASE_URL}/invoices/${fileName}`;
  return { filePath, publicUrl };
}

async function tryUploadToS3(buffer: Buffer, fileName: string): Promise<void> {
  const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || process.env.MINIO_ENDPOINT;
  if (!endpoint) return; // no config, skip silently

  // Try AWS SDK S3 if available
  try {
    // dynamic import to avoid hard dep
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || "hostamar";
    const region = process.env.S3_REGION || process.env.R2_REGION || "auto";
    const accessKey = process.env.R2_ACCESS_KEY || process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "";
    const secretKey = process.env.R2_SECRET_KEY || process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
    if (!accessKey || !secretKey) {
      console.warn("[invoice] S3 upload skipped: missing credentials");
      return;
    }
    const client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `invoices/${fileName}`,
        Body: buffer,
        ContentType: "application/pdf",
        ACL: "public-read" as any,
      })
    );
    console.log(`[invoice] uploaded to S3 ${endpoint}/invoices/${fileName}`);
  } catch (err: any) {
    // fallback: try plain PUT via fetch if SDK not installed
    if (err?.code === "MODULE_NOT_FOUND" || err?.message?.includes("Cannot find module")) {
      console.warn("[invoice] @aws-sdk/client-s3 not installed, skipping S3 upload (local file saved)");
      return;
    }
    console.warn("[invoice] S3 upload failed:", err?.message || err);
  }
}

// ---- Public: generateInvoice ----
export async function generateInvoice(
  params: GenerateInvoiceParams | string,
  opts: { throwOnError?: boolean } = {}
): Promise<{ invoiceUrl: string; filePath: string; invoiceNumber: string } | null> {
  // Backward compat: generateInvoice(orderId:string)
  if (typeof params === "string") {
    const orderId = params;
    if (!orderId) return null;
    try {
      // Try to fetch Payment by transactionId to build proper params
      const payment: any = await prisma.payment.findUnique({
        where: { transactionId: orderId },
        include: { customer: true as any },
      } as any);
      if (!payment) {
        console.warn("[generateInvoice] legacy: payment not found for", orderId);
        return null;
      }
      const legacyParams: GenerateInvoiceParams = {
        customerName: payment.customer?.name || payment.customerName || "Customer",
        email: payment.customer?.email || payment.customerEmail || "unknown@hostamar.com",
        tier: payment.planName || payment.tier || "Starter",
        amount: Number(payment.amount) || 0,
        credits: payment.creditsAdded || payment.credits || 0,
        trxId: payment.transactionId || orderId,
        invoiceNumber: payment.invoiceNumber || `INV-${formatDateShort()}-${orderId.slice(-6).toUpperCase()}`,
        date: new Date(),
        customerId: payment.customerId,
      };
      return generateInvoice(legacyParams, opts);
    } catch (e: any) {
      console.error("[generateInvoice] legacy error:", e?.message);
      if (opts.throwOnError) throw e;
      return null;
    }
  }

  const p = params as GenerateInvoiceParams;
  try {
    if (!p.customerName || !p.email) throw new Error("customerName and email required");
    const dateStr = formatDate(p.date);
    const shortDate = formatDateShort(p.date);
    const idPart = p.id ? sanitizeInvoiceNumber(p.id) : p.trxId ? sanitizeInvoiceNumber(p.trxId.slice(-8).toUpperCase()) : safeId().slice(0, 8).toUpperCase();
    const invoiceNumber = p.invoiceNumber ? sanitizeInvoiceNumber(p.invoiceNumber) : `INV-${shortDate}-${idPart}`;

    const pdfBuf = await buildPdfBuffer(p, invoiceNumber, dateStr);
    const fileName = `${sanitizeInvoiceNumber(invoiceNumber)}.pdf`;
    const { filePath, publicUrl } = await saveInvoiceFile(pdfBuf, fileName);

    // Try MinIO/S3 upload (non-blocking failure)
    await tryUploadToS3(pdfBuf, fileName);

    // Also try to persist invoiceUrl on Payment if we can find it by trxId
    try {
      const existing: any = await prisma.payment.findFirst({ where: { transactionId: p.trxId } as any });
      if (existing && !existing.invoiceUrl) {
        await prisma.payment.update({ where: { id: existing.id }, data: { invoiceUrl: publicUrl } as any });
      }
    } catch {}

    return { invoiceUrl: publicUrl, filePath, invoiceNumber };
  } catch (err: any) {
    console.error("[generateInvoice] error:", err?.message || err);
    if (opts.throwOnError) throw err;
    return null;
  }
}

// ---- SeoEvent + Slack helpers ----
export async function recordSeoEvent(data: {
  customerId?: string | null;
  email: string;
  tier: string;
  amount: number;
  credits: number;
  trxId: string;
  invoiceNumber?: string;
}): Promise<void> {
  const payloadObj = {
    email: data.email,
    tier: data.tier,
    amount: data.amount,
    credits: data.credits,
    trxId: data.trxId,
    invoiceNumber: data.invoiceNumber || null,
    at: new Date().toISOString(),
  };
  const payloadStr = JSON.stringify(payloadObj);
  // Try shapes in order: postgres Json, sqlite String, minimal fallback, ActivityLog
  const attempts: Array<() => Promise<void>> = [
    // 1) Postgres Json shape
    async () => {
      await (prisma as any).seoEvent.create({
        data: {
          event: "payment_success",
          properties: payloadObj as any,
          customerId: data.customerId || undefined,
          type: "payment_success",
          payload: payloadObj as any,
          email: data.email,
          tier: data.tier,
          amount: data.amount,
          trxId: data.trxId,
        },
      });
    },
    // 2) SQLite String shape
    async () => {
      await (prisma as any).seoEvent.create({
        data: {
          event: "payment_success",
          properties: payloadStr,
          type: "payment_success",
          payload: payloadStr,
          email: data.email,
          tier: data.tier,
          amount: data.amount,
          trxId: data.trxId,
          customerId: data.customerId || undefined,
        },
      });
    },
    // 3) Minimal shape (just required fields)
    async () => {
      await (prisma as any).seoEvent.create({
        data: {
          event: "payment_success",
          email: data.email,
          tier: data.tier,
          amount: data.amount,
          trxId: data.trxId,
        },
      });
    },
  ];
  for (let i = 0; i < attempts.length; i++) {
    try {
      await attempts[i]();
      console.log(`[seoEvent] payment_success recorded (attempt ${i + 1}) for`, data.email);
      return;
    } catch (e: any) {
      if (i === attempts.length - 1) {
        console.warn("[seoEvent] all attempts failed:", e?.message);
      }
    }
  }
  // final fallback: ActivityLog
  try {
    await prisma.activityLog.create({
      data: {
        customerId: data.customerId || undefined,
        action: "payment_success",
        description: `Payment success: ${data.amount} Taka ${data.tier} ${data.credits}cr ${data.email} Trx ${data.trxId}`,
        metadata: payloadStr,
      } as any,
    });
    console.log("[seoEvent] fallback to ActivityLog");
  } catch {}
}

export async function notifySlack(data: {
  amount: number;
  tier: string;
  credits: number;
  email: string;
  trxId: string;
}): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  const text = `💰 New payment ${data.amount} Taka ${data.tier} ${data.credits}cr ${data.email} TrxID ${data.trxId}`;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.warn("[slack] webhook failed:", res.status, await res.text().catch(() => ""));
    } else {
      console.log("[slack] notified:", text);
    }
  } catch (e: any) {
    console.warn("[slack] error:", e?.message);
  }
}

// ---- Combined: onPaymentApproved — call this from bKash/Stripe/PayPal success ----
export async function onPaymentApproved(params: GenerateInvoiceParams): Promise<{
  invoiceUrl: string | null;
  invoiceNumber: string | null;
}> {
  let invoiceUrl: string | null = null;
  let invoiceNumber: string | null = params.invoiceNumber || null;

  // 1) Generate invoice PDF
  try {
    const res = await generateInvoice(params);
    if (res) {
      invoiceUrl = res.invoiceUrl;
      invoiceNumber = res.invoiceNumber;
    }
  } catch (e) {
    console.warn("[onPaymentApproved] invoice generation failed:", (e as Error).message);
  }

  // 2) SeoEvent
  await recordSeoEvent({
    customerId: params.customerId || null,
    email: params.email,
    tier: params.tier,
    amount: params.amount,
    credits: params.credits,
    trxId: params.trxId,
    invoiceNumber: invoiceNumber || undefined,
  });

  // 3) Slack
  await notifySlack({
    amount: params.amount,
    tier: params.tier,
    credits: params.credits,
    email: params.email,
    trxId: params.trxId,
  });

  return { invoiceUrl, invoiceNumber };
}

// Alias for ergonomics
export const createInvoice = generateInvoice;
export const handlePaymentSuccess = onPaymentApproved;

export default generateInvoice;
