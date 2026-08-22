# Personal Payment — Android SMS Sync Setup

Hostamar supports **automatic payment verification** via SMS sync. An Android app
forwards incoming bKash/Nagad/Rocket payment SMS to Hostamar, which auto-matches
them against pending TrxID submissions and instantly verifies the payment.

This follows the **bKash Sync** open-source pattern (Android → webhook).

## How it works

```
Customer sends money ──> Your phone receives SMS
                              │
                              ▼
                    Android SMS-sync app
                              │  POST /api/payments/sms-webhook
                              ▼
                    Hostamar parses SMS
                    (amount, TrxID, sender)
                              │
                              ▼
                    Matches PENDING TrxID submission
                    (same TrxID + amount ±1 Tk)
                              │
                              ▼
                    AUTO-VERIFIED → credits + subscription
```

## 1. Get the webhook URL + secret

- Webhook URL: `https://hostamar.com/api/payments/sms-webhook`
- Secret: the value of `SMS_WEBHOOK_SECRET` in your `.env.local` / Vercel env.
  Send it as the header `x-sms-secret: <secret>` (or `Authorization: Bearer <secret>`).

## 2. Install an SMS-forwarding app

Any app that can POST incoming SMS to a webhook works. Options:

- **SMS Forwarder** (open source, GitHub: pppscorers/SMSForwarder) — recommended
- **Tasker** + HTTP Request plugin
- **bKash Sync** (if you have the APK)

## 3. Configure the forwarding rule

Set the app to forward SMS that match payment keywords. Example filter:

```
contains: "TrxID" OR "TrxId" OR "ট্রাক্স"
```

Configure the webhook sender:

| Field | Value |
|---|---|
| URL | `https://hostamar.com/api/payments/sms-webhook` |
| Method | POST |
| Header | `x-sms-secret: <SMS_WEBHOOK_SECRET>` |
| Header | `Content-Type: application/json` |
| Body | `{ "sms": "{{sms_body}}" }` |

(`{{sms_body}}` is SMS Forwarder's placeholder for the full message text. Adjust to
your app's template syntax.)

## 4. SMS formats we parse

The parser (`lib/payments/personal.ts → parsePaymentSms`) handles:

**bKash (English):**
```
You have received Tk 500.00 from 01712345678. TrxID 9HK3X2AB1C at 10:30AM. Balance Tk 1,234.56
```

**bKash (Bangla):**
```
আপনি 01712345678 থেকে ৫০০.০০ টাকা পেয়েছেন। TrxID: 9HK3X2AB1C
```

**Nagad / Rocket** variants with `Tk`/`টাকা` amounts and a TrxID token.

Extracted fields: `provider`, `amount`, `trxId`, `senderNumber`, `balance`.

## 5. Matching rules

A pending submission auto-verifies when an SMS matches:
- **Same TrxID** (case-insensitive, normalized to uppercase)
- **Amount within ±1 Tk** of the claimed amount
- SMS received within the **5-minute match window**

If no SMS matches, the submission stays **PENDING** for 15 minutes, then an admin
can approve/reject it manually at `/admin/payments`.

## Security notes

- The webhook is protected by `SMS_WEBHOOK_SECRET`. Rotate it if leaked.
- Only the raw SMS text is stored (`SmsLog`). No credentials are transmitted.
- Duplicate TrxIDs are rejected (unique constraint).

## Testing

```bash
curl -X POST https://hostamar.com/api/payments/sms-webhook \
  -H "Content-Type: application/json" \
  -H "x-sms-secret: $SMS_WEBHOOK_SECRET" \
  -d '{"sms":"You have received Tk 500.00 from 01712345678. TrxID 9HK3X2AB1C. Balance Tk 1000"}'
```

Expected: `{"ok":true,"logId":"...","matched":false,"reason":"no_pending_verification"}`
(matched=true only when a matching PENDING TrxID exists).
