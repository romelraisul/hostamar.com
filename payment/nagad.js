/**
 * Hostamar Nagad Payment API
 * Endpoint: /api/payment/nagad
 */

const NAGAD_API_URL = process.env.NAGAD_API_URL || 'https://api.nagad.com.bd';
const NAGAD_MERCHANT_ID = process.env.NAGAD_MERCHANT_ID || '';
const NAGAD_API_KEY = process.env.NAGAD_API_KEY || '';

async function getNagadToken() {
  const response = await fetch(`${NAGAD_API_URL}/api/v2/checker/store_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-APP-Key': NAGAD_API_KEY },
  });
  const data = await response.json();
  return data.token;
}

async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { action, amount, orderId, phoneNumber, currency = 'BDT' } = req.body;
      if (action === 'create') {
        const token = await getNagadToken();
        const response = await fetch(`${NAGAD_API_URL}/api/v2/send_payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            merchant_id: NAGAD_MERCHANT_ID,
            order_id: `HOSTAMAR-${orderId || Date.now()}`,
            amount: amount.toString(), currency_code: currency,
            customer_mobile: phoneNumber,
            datetime: new Date().toISOString(),
            description: 'Hostamar Subscription Payment',
          }),
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      if (action === 'verify') {
        const { paymentRefId } = req.body;
        const token = await getNagadToken();
        const response = await fetch(`${NAGAD_API_URL}/api/v2/verify_payment/${paymentRefId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      if (action === 'refund') {
        const { paymentRefId } = req.body;
        const token = await getNagadToken();
        const response = await fetch(`${NAGAD_API_URL}/api/v2/cancel_payment/${paymentRefId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : 400).json(data);
      }
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Nagad API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: true } };