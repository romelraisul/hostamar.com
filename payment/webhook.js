/**
 * Hostamar Payment Verification Webhook
 */

async function handler(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expectedSignature) {
    console.error('[WEBHOOK] PAYMENT_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { provider, paymentId, status, amount, transactionId, customerId, planName } = req.body;
    console.log(`[WEBHOOK] ${provider} payment ${paymentId}: ${status} - ${amount}`);
    if (status === 'completed' || status === 'success') {
      console.log(`  Payment ${paymentId} verified - activating subscription`);
    }
    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: true } };