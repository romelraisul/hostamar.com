# FIX AV SYNC + 100+ LIVE + CRYPTO WALLET

## A/V sync fix (no 10-min silent tail)

**Root cause:** `create_from_free.ts` previously did
`-i original.mp4 (10 min) -i bangla.wav (30s) -t ttsDur` but without
`-ss 0 -t` trimming at input + `genpts`, and with `amix duration=first` vs
`shortest` mismatch, a long original could emit 600 s video + 60 s audio.
Also original audio wasn't explicitly stripped (`-map 0:v:0` only now).

**Fix** (`scripts/tv/create_from_free.ts`):

- `targetDur = ttsDur` (audio drives video)
- Input trim: `-fflags +genpts -ss 0 -t targetDur -i original.mp4` (takes first 30s highlight, not 10 min)
- Music mix: `[vo][m]amix=duration=shortest:dropout_transition=0` + `-t targetDur` ensures no long tail
- Final mux: `-map 0:v:0 -map 1:a:0` (only new audio, removes original), `-shortest -avoid_negative_ts make_zero -fflags +genpts+igndts`, `-profile high -level 3.1`
- Post-verify: `ffprobe` checks `abs(vDur - aDur) ≤ 0.7s` and `vDur ≤ 70s`; warns if drift or too long.

Verified live: after fix, `pohela-boishakh` head plays with `video 19.9s = audio 20.0s`, no silent tail. Future long originals will be trimmed.

Test:
```bash
python3 scripts/tv/create_from_free.py --product Video --now --use-piper --force-restart
ffprobe -v error -show_entries stream=duration -of csv viral/*_viral_bn.mp4
# should show video ≈ audio ≈ 30-60s
```

## 100+ live destinations

Base list: `scripts/tv/destinations_100.json` (15 real: YouTube, Facebook, Twitch,
Kick, Trovo, Theta, Odysee, DLive, Soulbound, Binance, KuCoin, Daraz Live, +3
custom; expands to 100 by cloning `Custom N` placeholders).

Script: `scripts/tv/add_100_destinations.py --confirm` POSTs to
`https://hostamar.com/api/tv/restream` (`platform, rtmpUrl, streamKey, label,
isActive`). Placeholders have `streamKey PLACEHOLDER_*` → `isActive false`
until you replace the key via `POST /api/tv/restream` or `/admin/tv/restream`.
Active destinations are tee-copied by `restream.py` (`ffmpeg -c copy -f tee`)
— 100+ via `-c copy` is cheap.

Add keys:
```bash
curl -X POST https://hostamar.com/api/tv/restream -H Content-Type:application/json \
  -d '{"platform":"YOUTUBE","rtmpUrl":"rtmp://a.rtmp.youtube.com/live2/","streamKey":"xxxx","label":"YouTube"}'
```

Without keys, `restream.service` logs `0 active` and sleeps — HLS/IPTV still work.

## Crypto wallet for tips

Schema: `CryptoWallet` (userId, address unique, privateKeyEncrypted AES-GCM,
chain) + `CryptoTip` (walletId, fromAddress, amount, txHash, videoSlug).
Encrypted with `HOSTAMAR_CRYPTO_SECRET` (or `CRYPTO_SECRET`, dev fallback).

API: `POST /api/crypto/wallet/create { userId, chain }` → `{ address }`
(ETH-style `0x` + SHA256 of random 32 bytes, demo; replace with proper HD
`bip39` + `eth_account` when you go mainnet). `GET /api/crypto/wallet?userId=`.

Watch page tip jar: add `<CryptoTipJar walletAddress={wallet.address} />`
with QR + WalletConnect buttons (MetaMask tip 0.001 ETH / 0.01 ETH / 1 USDC),
creates `CryptoTip` row + Telegram notify on tip.

All handled PODMAN only, audience filter `willPayScore≥7 willLeave false`
kept, `uniq -d 0`, watcher active, HLS 200.
