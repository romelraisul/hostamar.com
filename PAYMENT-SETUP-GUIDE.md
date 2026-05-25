# 💳 Hostamar Payment Integration — Complete Setup Guide

**Version:** 1.0  
**Last Updated:** May 2026  
**Project:** hostamar.com — AI Video Generation Platform  
**Pricing Plans:**
| Plan | Price (BDT) | Videos | 
|------|-------------|--------|
| Free | ৳0 | 5 videos/month |
| Starter | ৳2,000/mo | 10 videos/month |
| Business | ৳3,500/mo | 30 videos/month |
| Enterprise | ৳6,000/mo | Unlimited |

**Supported Payment Methods:**
1. bKash (Manual QR + API)
2. Nagad (Manual QR + API)
3. USDT Crypto (BEP20 / TRC20)

---

## Table of Contents

1. [bKash Merchant Account Setup](#1-bkash-merchant-account-setup)
2. [Nagad Merchant Account Setup](#2-nagad-merchant-account-setup)
3. [USDT Wallet Setup (Trust Wallet / MetaMask)](#3-usdt-wallet-setup)
4. [Environment Variables (.env) Configuration](#4-environment-variables-env-configuration)
5. [API Integration Reference](#5-api-integration-reference)
6. [Pricing & Fee Comparison](#6-pricing--fee-comparison)
7. [Security Best Practices](#7-security-best-practices)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. bKash Merchant Account Setup

### 1.1 Manual Collection (Quick Start — 30 min)

Use this to start accepting payments immediately while API approval is pending.

**Step 1: Create bKash Account**
1. Open the bKash app on your phone
2. Register as a "Merchant" (or use personal account initially)
3. Note your bKash merchant number (01X-XXXXXXXX)

**Step 2: Generate QR Code**
1. Visit `https://www.qr-code-generator.com/` or any free QR generator
2. Enter your bKash number as the input
3. Download the QR code as PNG (`bkash-qr.png`)
4. Place it in `/public/` directory of the project

**Step 3: Add to Payment Page**
Add bKash as a payment option on the pricing/dashboard page.

**Step 4: Manual Verification Process**
When a customer pays:
1. Check bKash app for the transaction notification
2. Verify: Amount matches, Sender number is correct, Transaction ID is valid
3. Mark order as "Paid" in the admin dashboard
4. Activate the user's premium subscription
5. Send a confirmation email

### 1.2 bKash API Integration (Production)

For automated payment processing, integrate the bKash Merchant API.

**Step 1: Apply for API Access**
- Email: `business@bkash.com`
- Phone: `09610004567`
- Subject: "Merchant API Integration — Hostamar.com"
- Required Documents:
  - Business registration certificate (Trade License)
  - NID of the business owner
  - Bank account details
  - Website URL
  - Business description

**Step 2: Get API Credentials**
After approval (3–5 business days), bKash will provide:
- `BKASH_API_KEY` — Your app key (merchant identifier)
- `BKASH_API_SECRET` — Your app secret (used for authentication)
- `BKASH_USERNAME` — Merchant panel username
- `BKASH_PASSWORD` — Merchant panel password
- `BKASH_BASE_URL` — API endpoint URL
  - Sandbox: `https://tokenized.sandbox.bka.sh/v1.2.0-beta`
  - Live: `https://tokenized.pay.bka.sh/v1.2.0-beta`

**Step 3: Understand the API Flow**

The bKash Tokenized Checkout API works as follows:

```
1. Client → Server: Request payment (amount, orderId)
2. Server → bKash: POST /token/grant (get id_token)
3. Server → bKash: POST /create (get paymentID + redirectURL)
4. Server → Client: Return redirectURL
5. Client → bKash: User completes payment in bKash app/browser
6. bKash → Server: POST callback (paymentID, status)
7. Server → bKash: POST /execute/{paymentID} (confirm payment)
8. Server → Client: Payment confirmed, account upgraded
```

**Available API Actions (see `payment/bkash.js`):**

| Action | Endpoint | Purpose |
|--------|----------|---------|
| `create` | POST /tokenized/checkout/create | Initiate a payment |
| `execute` | POST /tokenized/checkout/execute/{paymentID} | Confirm after callback |
| `query` | GET /tokenized/checkout/payment/{paymentID} | Check payment status |
| `refund` | POST /tokenized/checkout/payment/{paymentID}/refund | Issue a refund |

**Step 4: Sandbox Testing**
Before going live, test with the bKash sandbox environment:
- Sandbox credentials are provided separately
- Use test payer numbers to simulate payments
- Verify callback URLs work correctly

**Step 5: Go Live**
- Update `BKASH_BASE_URL` to production endpoint
- Ensure your server has HTTPS enabled
- Test a real transaction with a small amount (e.g., ৳10)

**Fees:** 1.5% per transaction (charged to merchant)

---

## 2. Nagad Merchant Account Setup

### 2.1 Manual Collection (Quick Start — 30 min)

**Step 1: Create Nagad Account**
1. Open the Nagad app on your phone
2. Register as a merchant
3. Note your Nagad merchant number (01X-XXXXXXXX)

**Step 2: Generate QR Code**
1. Use a free QR generator
2. Enter your Nagad number
3. Download as PNG (`nagad-qr.png`)
4. Place in `/public/` directory

**Step 3: Manual Verification**
Same process as bKash — check the Nagad app for incoming payments and manually activate subscriptions.

### 2.2 Nagad API Integration (Production)

**Step 1: Apply for API Access**
- Website: `https://developer.nagad.com.bd`
- Email: `support@nagad.com.bd`
- Phone: `037-3333333`
- Required Documents:
  - Trade license
  - Bank account information
  - NID copy
  - Office address

**Step 2: Get API Credentials**
After approval (5–7 business days), Nagad will provide:
- `NAGAD_MERCHANT_ID` — Your unique merchant identifier
- `NAGAD_API_KEY` — API key for authentication
- `NAGAD_API_URL` — API base URL
  - Sandbox: `https://sandbox.nagad.com.bd`
  - Live: `https://api.nagad.com.bd`

**Step 3: Understand the API Flow**

```
1. Client → Server: Request payment (amount, phoneNumber)
2. Server → Nagad: POST /store_token (get auth token)
3. Server → Nagad: POST /send_payment (initiate)
4. Nagad → Customer: Payment request on their Nagad app
5. Customer: Approves payment in Nagad app
6. Server → Nagad: POST /verify_payment/{refId} (check status)
7. Server → Client: Payment confirmed
```

**Available API Actions (see `payment/nagad.js`):**

| Action | Endpoint | Purpose |
|--------|----------|---------|
| `create` | POST /api/v2/send_payment | Initiate a payment request |
| `verify` | GET /api/v2/verify_payment/{paymentRefId} | Verify payment status |
| `refund` | POST /api/v2/cancel_payment/{paymentRefId} | Cancel/refund a payment |

**Step 4: Testing**
- Use Nagad sandbox credentials for test payments
- Verify that callback/redirect URLs are correctly configured
- Test both successful and failed payment scenarios

**Step 5: Go Live**
- Update `NAGAD_API_URL` to production
- Perform a test transaction with a small amount

**Fees:** 0.5% per transaction (lowest among BD mobile financial services)

---

## 3. USDT Wallet Setup

USDT (Tether) is the most popular stablecoin in Bangladesh. It's pegged 1:1 to USD and can be sent on multiple networks.

### 3.1 Option A: Trust Wallet (Mobile — Recommended)

**Step 1: Install Trust Wallet**
1. Download Trust Wallet from the App Store (iOS) or Google Play (Android)
2. Open the app and tap "Create a new wallet"
3. **IMPORTANT:** Back up your 12-word seed phrase on paper. Store it somewhere safe. NEVER share it digitally.
4. Set a strong passcode and enable biometric authentication

**Step 2: Enable Binance Smart Chain (BSC)**
1. In Trust Wallet, tap the settings icon (top-right)
2. Tap "Networks" or "Wallet Management"
3. Ensure "Smart Chain" (BSC) is enabled
4. If not visible, add the BSC network manually:
   - Network Name: Binance Smart Chain
   - RPC URL: `https://bsc-dataseed.binance.org/`
   - Chain ID: `56`
   - Symbol: `BNB`
   - Block Explorer: `https://bscscan.com`

**Step 3: Get Your USDT (BEP20) Address**
1. On the main wallet screen, tap "Receive"
2. Search for "USDT"
3. Select "USDT (BEP20)" — **this is VERY important, select the correct network**
4. Copy the wallet address (starts with `0x`)
5. This is your `USDT_WALLET_ADDRESS`

**Step 4: Enable TRC20 Network (Optional — for lower fees)**
1. In Trust Wallet settings, enable "Tron" network
2. Go to Receive → search for USDT → select "USDT (TRC20)"
3. Copy the TRC20 address (starts with `T`)
4. **Note:** TRC20 fees are typically lower than BEP20

### 3.2 Option B: MetaMask (Browser Extension)

**Step 1: Install MetaMask**
1. Install the MetaMask extension for Chrome, Firefox, or Brave
2. Create a new wallet
3. Back up the seed phrase safely
4. Set a strong password

**Step 2: Add Binance Smart Chain Network**
Open MetaMask → Settings → Networks → Add Network:

```
Network Name: Binance Smart Chain
RPC URL: https://bsc-dataseed.binance.org/
Chain ID: 56
Currency Symbol: BNB
Block Explorer URL: https://bscscan.com
```

**Step 3: Get USDT (BEP20) Address**
1. In MetaMask, switch to Binance Smart Chain network
2. Your wallet address is at the top (starts with `0x`)
3. To receive USDT, you'll need to add the USDT token contract:
   - Tap "Import Tokens" → "Custom Token"
   - USDT BEP20 Contract Address: `0x55d398326f99059fF775485246999027B3197955`
   - Token Symbol: `USDT`
   - Decimals: `18`
4. Copy your wallet address → This is your `USDT_WALLET_ADDRESS`

**Step 4: Add TRC20 Network (Optional)**
For TRC20, you can use TronLink extension or Trust Wallet (MetaMask doesn't natively support TRC20 without custom RPC). Trust Wallet is recommended for TRC20.

### 3.3 Option C: Binance Pay (Easiest — No Wallet Setup)

1. Create a Binance account at `https://binance.com`
2. Complete identity verification (KYC)
3. Enable "Binance Pay" in the app
4. Get your Binance Pay ID or QR code
5. On your payment page, direct users to pay via Binance Pay
6. **Benefit:** No need to manage private keys — Binance handles everything

### 3.4 Network Comparison

| Feature | BEP20 (BSC) | TRC20 (Tron) | ERC20 (Ethereum) |
|---------|-------------|--------------|-------------------|
| Address Format | Starts with `0x` | Starts with `T` | Starts with `0x` |
| Transaction Fee | ~$0.03–$0.10 | ~$0.01–$0.05 | ~$1–$10 |
| Speed | 3–5 seconds | 1–3 seconds | 10–30 seconds |
| Popularity in BD | Very High | Highest | Low |
| Wallet Support | Trust Wallet, MetaMask | Trust Wallet, TronLink | MetaMask, Trust Wallet |
| Block Explorer | bscscan.com | tronscan.org | etherscan.io |

**Recommendation for Bangladesh:** Use **TRC20** (lowest fees) as primary, **BEP20** as backup.

---

## 4. Environment Variables (.env) Configuration

The `.env` file at the project root contains all payment-related keys. Below is the complete reference.

### 4.1 bKash Environment Variables

```env
# ===== BKASH PAYMENT =====
# Get these from bKash Developer Portal after API approval:
# 1. Apply at business@bkash.com with business docs
# 2. They will provide App Key, App Secret, Username, Password
# 3. Sandbox URL: https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_API_KEY=YOUR_BKASH_API_KEY
# ↑ Your bKash App Key (merchant identifier) — from bKash Developer Portal
#   Format: alphanumeric string (e.g., "4f6o0cj5pxk8i5s2m1b7q5a7p0n4t5p6")
#   Used in: payment/bkash.js — sent as X-APP-Key header

BKASH_API_SECRET=YOUR_BKASH_SECRET
# ↑ Your bKash App Secret — from bKash Developer Portal
#   Format: alphanumeric string (e.g., "0a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b")
#   Used for: Base64-encoded Basic Auth to get the id_token
#   WARNING: Keep this secret — never share or commit to git

BKASH_USERNAME=YOUR_BKASH_USERNAME
# ↑ Your bKash Merchant Panel username — from bKash Developer Portal
#   Used for: merchant panel login and some API calls
#   Example: hostamar_merchant

BKASH_PASSWORD=YOUR_BKASH_PASSWORD
# ↑ Your bKash Merchant Panel password — from bKash Developer Portal
#   Used for: merchant panel login
#   WARNING: Keep this secret
```

### 4.2 Nagad Environment Variables

```env
# ===== NAGAD PAYMENT =====
# Get these from Nagad Developer Portal after API approval:
# 1. Register at https://developer.nagad.com.bd
# 2. Submit business documents
# 3. They will provide Merchant ID and API Key
NAGAD_API_KEY=YOUR_NAGAD_API_KEY
# ↑ Your Nagad API Key — from Nagad Developer Portal
#   Format: alphanumeric string
#   Used in: payment/nagad.js — sent as X-APP-Key header
#   For: authenticating with Nagad API gateway

NAGAD_MERCHANT_ID=YOUR_NAGAD_MERCHANT_ID
# ↑ Your Nagad Merchant ID — from Nagad Developer Portal
#   Format: numeric or alphanumeric string
#   Used in: payment/nagad.js — sent as merchant_id in payment requests
#   This tells Nagad which merchant receives the funds
```

### 4.3 USDT (Crypto) Environment Variables

```env
# ===== CRYPTO PAYMENT (USDT BEP20 / TRC20) =====
# Set up a wallet using Trust Wallet or MetaMask (see Section 3 above)
USDT_WALLET_ADDRESS=YOUR_USDT_TRC20_WALLET
# ↑ Your USDT wallet address for receiving payments
#   BEP20 format: 0x followed by 40 hex characters (e.g., 0xAbC123...789D)
#   TRC20 format: T followed by 33 characters (e.g., TXYZ123...789)
#   CONFIGURATION:
#     1. Create wallet in Trust Wallet or MetaMask (see Section 3)
#     2. Copy your USDT receiving address
#     3. Paste it here
#   IMPORTANT: Specify which network (BEP20/TRC20) in your payment page UI
#   Used in: payment/crypto.js — returned as the address for customers to send to

USDT_PRIVATE_KEY=YOUR_USDT_PRIVATE_KEY
# ↑ Your wallet's private key — ONLY needed if implementing auto-withdrawal
#   Format: 64-character hex string (for BEP20) or base58 (for TRC20)
#   WARNING: This is the most sensitive credential in your entire system.
#   If exposed, someone can drain your entire wallet.
#   SECURITY RECOMMENDATIONS:
#     - NOT needed for receiving payments — only for automated payouts
#     - Store in a separate, encrypted vault if possible
#     - Consider using a hot wallet (small balance) for auto-payouts
#     - Keep the main funds in a cold wallet (hardware wallet)
#   CURRENT USAGE: The crypto.js API currently only generates payment requests
#   and does NOT use this key. It's reserved for future auto-verification.
```

### 4.4 Webhook Configuration

```env
# ===== PAYMENT WEBHOOK =====
# Used by payment/webhook.js to verify incoming webhook calls
PAYMENT_WEBHOOK_SECRET=webhook-secret
# ↑ Secret key for verifying webhook signatures from payment providers
#   Set to a random, complex string in production
#   Generate with: openssl rand -hex 32
#   Used in: payment/webhook.js — validates x-webhook-signature header
```

### 4.5 Complete .env Payment Section Reference

Paste this block into your `.env` file (under the `# ===== PAYMENT KEYS =====` section):

```env
# ===== PAYMENT KEYS =====
# BKASH — Merchant API credentials
# Apply at business@bkash.com — approval takes 3-5 business days
BKASH_API_KEY=YOUR_BKASH_API_KEY
BKASH_API_SECRET=YOUR_BKASH_SECRET
BKASH_USERNAME=YOUR_BKASH_USERNAME
BKASH_PASSWORD=YOUR_BKASH_PASSWORD

# NAGAD — Merchant API credentials
# Apply at https://developer.nagad.com.bd — approval takes 5-7 business days
NAGAD_API_KEY=YOUR_NAGAD_API_KEY
NAGAD_MERCHANT_ID=YOUR_NAGAD_MERCHANT_ID

# USDT CRYPTO — Wallet for receiving USDT payments (BEP20/TRC20)
# Create wallet in Trust Wallet or MetaMask (see PAYMENT-SETUP-GUIDE.md Section 3)
USDT_WALLET_ADDRESS=YOUR_USDT_TRC20_WALLET
# Private key only needed for auto-withdrawal — keep in secure vault
USDT_PRIVATE_KEY=YOUR_USDT_PRIVATE_KEY

# Webhook secret for payment callback verification
PAYMENT_WEBHOOK_SECRET=webhook-secret
```

---

## 5. API Integration Reference

### 5.1 bKash API (`payment/bkash.js`)

**Endpoint:** `/api/payment/bkash`

**Environment Variables Used:**
- `BKASH_API_KEY` → `X-APP-Key` header
- `BKASH_API_SECRET` → Basic Auth for token grant
- `BKASH_BASE_URL` → API base URL (defaults to live URL)
- `NEXTAUTH_URL` → Callback URL base

**Token Lifecycle:**
- Token is cached in memory with expiry tracking
- New token is requested 60 seconds before expiry
- Expired tokens cause 401 errors — handled with auto-retry

**Error Handling:**
- All API errors return `{ error: errorMessage }`
- HTTP status codes: 200 (success), 400 (bad request), 405 (wrong method), 500 (server error)

### 5.2 Nagad API (`payment/nagad.js`)

**Endpoint:** `/api/payment/nagad`

**Environment Variables Used:**
- `NAGAD_MERCHANT_ID` → merchant_id in payment payload
- `NAGAD_API_KEY` → `X-APP-Key` header
- `NAGAD_API_URL` → API base URL

**Token Lifecycle:**
- New token is fetched on every request (stateless)
- Uses `/api/v2/checker/store_token` endpoint

### 5.3 Crypto API (`payment/crypto.js`)

**Endpoint:** `/api/payment/crypto`

**Environment Variables Used:**
- `USDT_WALLET_ADDRESS` → Returned as the receiving address

**Exchange Rate:**
- Fixed rate: 1 USDT = ৳110 BDT (defined in code as `USDT_BDT_RATE`)
- To update, change the constant in `payment/crypto.js`

**QR Code Generation:**
- Uses Google Charts API: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=usdt:{address}`
- Consider replacing with a self-hosted QR generator for production

**Verification:**
- Currently returns `pending_verification` status
- Full blockchain verification (using BscScan/Tronscan API) to be implemented

### 5.4 Web Hook (`payment/webhook.js`)

**Endpoint:** `/api/payment/webhook`

**Environment Variables Used:**
- `PAYMENT_WEBHOOK_SECRET` → Validates `x-webhook-signature` header

**Supported Providers:**
- Accepts notifications from bKash, Nagad, and crypto providers
- Triggers subscription activation on `completed`/`success` status

---

## 6. Pricing & Fee Comparison

### 6.1 Subscription Plans (BDT)

| Plan | Price | Videos | Best For |
|------|-------|--------|----------|
| Free | ৳0 | 5 videos/month | Trying the platform |
| Starter | ৳2,000/mo | 10 videos/month | Individual creators |
| Business | ৳3,500/mo | 30 videos/month | Growing teams |
| Enterprise | ৳6,000/mo | Unlimited | Agencies & businesses |

### 6.2 Crypto Equivalent Prices

| Plan | BDT | USDT | BUSD | Notes |
|------|-----|------|------|-------|
| Starter | ৳2,000 | ~$25 | ~$25 | |
| Business | ৳3,500 | ~$44 | ~$44 | |
| Enterprise | ৳6,000 | ~$75 | ~$75 | |

Rate: 1 USDT ≈ ৳110 BDT (update `USDT_BDT_RATE` in `payment/crypto.js` if rate changes)

### 6.3 Transaction Fees Comparison

| Method | Fee | Setup Time | Automation |
|--------|-----|-----------|------------|
| bKash (Manual QR) | 1.45% | 1 hour | Manual |
| bKash (API) | 1.5% | 3-5 days | Full API |
| Nagad (Manual QR) | 0.5% | 1 hour | Manual |
| Nagad (API) | 0.5% | 5-7 days | Full API |
| USDT (BEP20) | ~$0.03/tx | 20 min | Manual verify |
| USDT (TRC20) | ~$0.01/tx | 20 min | Manual verify |

---

## 7. Security Best Practices

### 7.1 API Keys & Secrets

- **NEVER commit** `.env` files to git (`.env` is already in `.gitignore`)
- Rotate API keys every 90 days
- Use separate sandbox and production keys
- Store `USDT_PRIVATE_KEY` in a hardware security module or encrypted vault whenever possible

### 7.2 Wallet Security

- **Hot wallet** (connected to the app): Keep only enough funds for 7 days of payouts
- **Cold wallet** (offline/hardware): Store the majority of funds here
- Transfer from hot to cold wallet weekly
- Never share seed phrases or private keys
- Use a dedicated wallet for the business — don't mix personal crypto

### 7.3 Payment Verification

- Always verify transaction IDs on the blockchain explorer before activating subscriptions:
  - BEP20: `https://bscscan.com/tx/{txHash}`
  - TRC20: `https://tronscan.org/#/transaction/{txHash}`
- Require minimum 3 blockchain confirmations before marking as paid
- Log all payment attempts (successful and failed) for audit
- Set up alerts for large payments (>৳10,000)

### 7.4 Webhook Security

- Validate the `x-webhook-signature` header on every incoming webhook
- Use a strong, random `PAYMENT_WEBHOOK_SECRET` (generate with `openssl rand -hex 32`)
- Whitelist IP addresses of payment providers if possible

---

## 8. Troubleshooting

### 8.1 bKash API Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `401 Unauthorized` | Expired or invalid API key | Check `BKASH_API_KEY` and `BKASH_API_SECRET` |
| `Token grant failed` | Wrong credentials | Verify credentials in bKash developer portal |
| `Payment creation failed` | Invalid amount or callback URL | Ensure callback URL is HTTPS and accessible |
| No callback received | URL not whitelisted | Add callback URL to bKash developer portal |

### 8.2 Nagad API Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `Invalid merchant` | Wrong `NAGAD_MERCHANT_ID` | Verify merchant ID in Nagad portal |
| `Authentication failed` | Wrong `NAGAD_API_KEY` | Regenerate API key if needed |
| Payment not received | Wrong customer phone number | Ensure phone number has correct country code |

### 8.3 Crypto Payment Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Wrong network selected | Customer sent on ERC20 instead of BEP20 | Train customers to double-check network |
| Funds not received | Wrong wallet address | Verify `USDT_WALLET_ADDRESS` in .env |
| Transaction stuck | Network congestion | Wait for confirmations (may take 10-30 min) |
| Wrong amount | Customer sent incorrect amount | Verify amount on blockchain explorer |

### 8.4 Generic Issues

| Problem | Solution |
|---------|----------|
| `.env` changes not reflecting | Restart the server after editing `.env` |
| CORS errors on payment API | Check middleware.ts for CORS configuration |
| Database not updating after payment | Check database connection and subscription update logic |

---

## Quick Start Checklist

### Day 1 (30 min — Start accepting payments!)
- [ ] Open bKash merchant account / note your bKash number
- [ ] Open Nagad merchant account / note your Nagad number
- [ ] Generate QR codes for both
- [ ] Add QR codes to payment page
- [ ] Set up manual verification process
- [ ] Update `.env` with initial keys
- [ ] Test payment flow with ৳1 transaction

### Week 1–2 (Get API access)
- [ ] Apply for bKash Merchant API (business@bkash.com)
- [ ] Apply for Nagad Merchant API (developer.nagad.com.bd)
- [ ] Set up Trust Wallet / MetaMask for USDT
- [ ] Add USDT wallet address to `.env`
- [ ] Generate QR codes for USDT addresses
- [ ] Update payment page with all three methods

### Week 2–3 (Automate)
- [ ] Configure webhook for automated payment verification
- [ ] Set up auto-activation of subscriptions
- [ ] Implement blockchain transaction verification
- [ ] Add email notifications for payment received

### Month 2 (Scale)
- [ ] Add SSLCommerz as a third-party gateway for card/bank payments
- [ ] Implement automated refunds
- [ ] Set up payment analytics dashboard
- [ ] Create recurring billing for enterprise clients

---

## Support Contacts

**bKash:**
- Phone: 09610004567
- Email: support@bkash.com
- WhatsApp: 01711114444

**Nagad:**
- Phone: 037-3333333
- Email: support@nagad.com.bd
- Website: developer.nagad.com.bd

**SSLCommerz (Alternative Gateway):**
- Email: business@sslwireless.com
- Phone: +88-02-55017070
- Skype: sslcommerz-sales

---

*This guide incorporates information from PAYMENT-GUIDE.md, CRYPTO-PAYMENT-GUIDE.md, and the payment API code in the `payment/` directory. For implementation details, refer to `payment/bkash.js`, `payment/nagad.js`, `payment/crypto.js`, and `payment/webhook.js`.*
