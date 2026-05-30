// File: /app/dashboard/payment/crypto/page.tsx
// Server Component

export default async function CryptoPaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            💰 Cryptocurrency Payment
          </h1>
          <p className="text-lg text-gray-600">
            Pay with USDT (BEP20) - Fast, secure, low fees
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Choose Plan</h3>
                    <p className="text-sm text-gray-600">Starter: ৳2,000</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Send USDT</h3>
                    <p className="text-sm text-gray-600">Transfer to wallet below</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Share TXID</h3>
                    <p className="text-sm text-gray-600">WhatsApp: 01822417463</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Get Verified</h3>
                    <p className="text-sm text-gray-600">Upgrade within 2 hours</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">Pricing</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Starter</span>
                  <span className="font-bold text-blue-600">৳2,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-semibold">Business</span>
                  <span className="font-bold text-blue-600">৳3,500</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Enterprise</span>
                  <span className="font-bold text-blue-600">৳6,000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">Wallet Address</h2>
              <p className="text-sm text-gray-600 mb-4">USDT BEP20 (BNB Chain)</p>
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-5xl mb-3">💎</div>
                <code className="text-green-400 font-mono text-xs break-all">
                  0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858
                </code>
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                <p>Network: BNB Smart Chain</p>
                <p>Fee: 0.5%</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">Verify Payment</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold">Steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Send exact amount</li>
                  <li>Copy TXID</li>
                  <li>WhatsApp us</li>
                  <li>Include email</li>
                </ol>
              </div>
              <a href="https://wa.me/8801822417463" target="_blank" rel="noopener" className="mt-3 block">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                  💬 WhatsApp
                </button>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 mt-8">
          <h2 className="text-lg font-bold mb-3">Other Methods</h2>
          <a href="/dashboard/payment" className="block mb-4">
            <button className="w-full py-3 border rounded-lg font-semibold">
              💳 bKash / Nagad
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
