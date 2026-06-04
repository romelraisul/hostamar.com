console.log('bKash Configuration')
module.exports = {
  bkash: {
    username: process.env.BKASH_USERNAME,
    password: process.env.BKASH_PASSWORD,
    appKey: process.env.BKASH_APP_KEY,
    appSecret: process.env.BKASH_APP_SECRET,
    sandbox: process.env.NODE_ENV !== 'production'
  },
  nagad: {
    merchantId: process.env.NAGAD_MERCHANT_ID,
    merchantNumber: process.env.NAGAD_MERCHANT_NUMBER,
    publicKey: process.env.NAGAD_PUBLIC_KEY,
    privateKey: process.env.NAGAD_PRIVATE_KEY
  },
  rocket: {
    merchant: process.env.ROCKET_MERCHANT,
    username: process.env.ROCKET_USERNAME,
    password: process.env.ROCKET_PASSWORD
  }
}