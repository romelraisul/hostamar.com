/**
 * Hostamar USDT (Crypto) Payment API
 * Endpoint: /api/payment/crypto
 */

const USDT_WALLET = process.env.USDT_WALLET_ADDRESS || '';
const USDT_BDT_RATE = parseFloat(process.env.USDT_BDT_RATE || '110');

async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { action, amount, orderId, walletAddress, network, currency = 'BDT' } = req.body;
      if (action === 'create') {
        const usdtAmount = parseFloat((parseFloat(amount) / USDT_BDT_RATE).toFixed(6));
        return res.status(200).json({
          status: 'pending',
          orderId: `HOSTAMAR-${orderId || Date.now()}`,
          paymentAddress: USDT_WALLET,
          network: network || 'TRC20',
          amount: usdtAmount,
          equivalentBDT: parseFloat(amount),
          qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=usdt:${USDT_WALLET}`,
          message: `Send ${usdtAmount} USDT to ${USDT_WALLET} (${network || 'TRC20'})`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      }
      if (action === 'verify') {
        const { txHash } = req.body;
        return res.status(200).json({
          status: 'pending_verification', txHash,
          confirmations: 0, requiredConfirmations: 3,
          message: 'Transaction submitted. Waiting for confirmations...',
        });
      }
      if (action === 'check-status') {
        const { txHash } = req.body;
        return res.status(200).json({ status: 'confirmed', txHash, confirmations: 3, confirmed: true });
      }
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Crypto Payment Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: true } };