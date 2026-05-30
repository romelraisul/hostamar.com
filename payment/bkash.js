/**
 * Hostamar bKash Payment API
 * Endpoint: /api/payment/bkash
 */

const BKASH_BASE_URL = process.env.BKASH_BASE_URL || 'https://tokenized.pay.bka.sh/v1.2.0-beta';
const BKASH_API_KEY = process.env.BKASH_API_KEY || '';
const BKASH_API_SECRET = process.env.BKASH_API_SECRET || '';

let bkashToken = null;
let tokenExpiry = 0;

async function getBkashToken() {
  if (bkashToken && Date.now() < tokenExpiry - 60000) return bkashToken;
  const auth = Buffer.from(`${BKASH_API_KEY}:${BKASH_API_SECRET}`).toString('base64');
  const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, 'X-APP-Key': BKASH_API_KEY },
    body: JSON.stringify({ app_key: BKASH_API_KEY, app_secret: BKASH_API_SECRET }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errorMessage || 'bKash token failed');
  bkashToken = data.id_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return bkashToken;
}

async function handler(req, res) {
  try {
    const token = await getBkashToken();
    if (req.method === 'POST') {
      const { action, amount, orderId, currency = 'BDT' } = req.body;
      if (action === 'create') {
        const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token, 'X-APP-Key': BKASH_API_KEY },
          body: JSON.stringify({
            mode: '0011', payerReference: orderId,
            callbackURL: `${process.env.NEXTAUTH_URL}/api/payment/bkash/callback`,
            amount: amount.toString(), currency, intent: 'sale',
            merchantInvoiceNumber: `INV-${Date.now()}`,
          }),
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      if (action === 'execute') {
        const { paymentID } = req.body;
        const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/execute/${paymentID}`, {
          method: 'POST', headers: { 'Authorization': token, 'X-APP-Key': BKASH_API_KEY },
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      if (action === 'query') {
        const { paymentID } = req.body;
        const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/payment/${paymentID}`, {
          headers: { 'Authorization': token, 'X-APP-Key': BKASH_API_KEY },
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      if (action === 'refund') {
        const { paymentID, amount: refundAmount, reason } = req.body;
        const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/payment/${paymentID}/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token, 'X-APP-Key': BKASH_API_KEY },
          body: JSON.stringify({ paymentID, amount: refundAmount.toString(), currency, reason: reason || 'Customer request', trxID: `REF-${Date.now()}` }),
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('bKash API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: true } };