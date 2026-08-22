import { env } from '@/lib/env'
console.log('bKash Configuration')
module.exports = {
  bkash: {
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    sandbox: env.NODE_ENV !== 'production'
  },
  nagad: {
    merchantId: env.NAGAD_MERCHANT_ID,
    merchantNumber: env.NAGAD_MERCHANT_NUMBER,
    publicKey: env.NAGAD_PUBLIC_KEY,
    privateKey: env.NAGAD_PRIVATE_KEY
  },
  rocket: {
    merchant: env.ROCKET_MERCHANT,
    username: env.ROCKET_USERNAME,
    password: env.ROCKET_PASSWORD
  }
}