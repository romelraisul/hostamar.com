// File: /app/dashboard/payment/crypto-info.tsx
// Add this to your payment page or as a separate section

export default function CryptoPaymentInfo() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-3">🪙 Pay with Cryptocurrency</h3>
      <p className="text-gray-600 mb-4">
        Can't use bKash/Nagad merchant? Pay with crypto!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-blue-600 mb-2">Wallet Addresses</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">USDT (BEP20):</span>
              <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                0x1234...abcd
              </code>
            </div>
            <div>
              <span className="text-gray-500">BUSD (BEP20):</span>
              <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                0x5678...efgh
              </code>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-green-600 mb-2">How to Pay</h4>
          <ol className="text-sm space-y-1 list-decimal ml-4">
            <li>Send ~$25 USDT to wallet above</li>
            <li>Copy transaction hash</li>
            <li>Send to WhatsApp: <strong>01822417463</strong></li>
            <li>Account upgraded in 2 hours!</li>
          </ol>
        </div>
      </div>
      
      <button 
        onClick={() => window.location.href = '/dashboard/payment/crypto'}
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        View Full Crypto Payment Guide
      </button>
    </div>
  )
}