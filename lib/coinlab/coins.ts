// CoinLab BD — Top 10 coin research seed (M1 scope: Top-100 target, 10 shipped first).
// FACTS ONLY: launch dates, founders, consensus, supply model — well-established
// public knowledge. NO live prices (M2: CoinGecko API), NO fabricated scores.
// Educational research — NOT investment advice (see /coinlab legal disclaimer).

export interface CoinProfile {
  slug: string
  name: string
  symbol: string
  emoji: string
  basic: { launched: string; founder: string; website: string }
  creation: { consensus: string; blockchain: string; openSource: boolean; note: string }
  tokenomics: { supply: string; inflation: string; burn: string }
  technology: { problem: string; summary: string }
  earning: string[]
  risk: string
}

export const COINS: CoinProfile[] = [
  {
    slug: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    emoji: '₿',
    basic: { launched: '3 January 2009', founder: 'Satoshi Nakamoto (pseudonymous)', website: 'bitcoin.org' },
    creation: { consensus: 'Proof of Work (SHA-256)', blockchain: 'নিজস্ব Layer-1 চেইন', openSource: true, note: 'Genesis block mined by Satoshi; open-source reference implementation (Bitcoin Core).' },
    tokenomics: { supply: '21 million hard cap', inflation: 'Halving প্রতি ৪ বছর — বর্তমান ব্লক রিওয়ার্ড 3.125 BTC (2024 halving)', burn: 'Lost keys permanently remove supply — no burn mechanism by protocol' },
    technology: { problem: 'Trustless, bank-free peer-to-peer digital money', summary: 'দুই পক্ষের মাঝে ব্যাংক ছাড়া সরাসরি লেনদেন — নেটওয়ার্ক নিজেই যাচাই করে।' },
    earning: ['Mining (PoW — ASIC hardware)', 'Trading / spot', 'Long-term holding', 'Lightning node routing fees'],
    risk: 'Volatility high. No audit needed for protocol itself (battle-tested 15+ years) — but exchanges/wallets are the real risk point.',
  },
  {
    slug: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    emoji: 'Ξ',
    basic: { launched: '30 July 2015', founder: 'Vitalik Buterin + 7 co-founders', website: 'ethereum.org' },
    creation: { consensus: 'Proof of Stake (The Merge, 15 Sep 2022)', blockchain: 'নিজস্ব Layer-1 + EVM', openSource: true, note: 'Smart contract platform — dApps, DeFi, NFT সব এখান থেকে শুরু।' },
    tokenomics: { supply: 'No hard cap — disinflationary', inflation: '~0% net issuance post-Merge (burned fees often exceed issuance)', burn: 'EIP-1559 base-fee burn — প্রতিটি ট্রানজেকশনে কিছু ETH স্থায়ীভাবে পুড়ে যায়' },
    technology: { problem: 'Programmable money — contracts that execute themselves', summary: 'Bitcoin শুধু পেমেন্ট; Ethereum এ যেকোনো শর্তাবলী কোড আকারে চলে — DeFi/DAO/NFT-র জন্মস্থান।' },
    earning: ['Staking (~3% net, PoS)', 'Restaking (EigenLayer etc.)', 'Liquidity providing / Yield farming', 'dApp development / auditing', 'Trading / futures'],
    risk: 'Smart contract risk on third-party dApps; staking has slashing risk. Core protocol heavily audited.',
  },
  {
    slug: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    emoji: '🅑',
    basic: { launched: 'July 2017 (ICO)', founder: 'Changpeng Zhao (CZ) / Binance', website: 'bnbchain.org' },
    creation: { consensus: 'Proof of Staked Authority (PoSA)', blockchain: 'BNB Smart Chain (EVM)', openSource: true, note: 'Exchange token থেকে শুরু — এখন নিজস্ব চেইনের gas token।' },
    tokenomics: { supply: 'Initial 200M — deflationary by burns', inflation: 'Quarterly auto-burn reduces supply toward 100M target', burn: 'Protocol auto-burn every quarter (real, on-chain)' },
    technology: { problem: 'Fast, cheap EVM transactions', summary: 'Ethereum-কম্প্যাটিবল কিন্তু কম ফি — Binance ইকোসিস্টেমের মূল চালিকাশক্তি।' },
    earning: ['Staking on BNB Chain', 'Launchpad/Launchpool participation', 'Liquidity on DEX (PancakeSwap)', 'Trading'],
    risk: 'Centralization concern (Binance influence + validator concentration). Regulatory actions exist — research before heavy exposure.',
  },
  {
    slug: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    emoji: '◎',
    basic: { launched: 'Mainnet beta 16 March 2020', founder: 'Anatoly Yakovenko (ex-Qualcomm)', website: 'solana.com' },
    creation: { consensus: 'Proof of History + Proof of Stake', blockchain: 'নিজস্ব Layer-1 (non-EVM)', openSource: true, note: 'Single global state machine — speed-optimized from scratch.' },
    tokenomics: { supply: 'No hard cap — ~5% initial annual inflation, disinflationary schedule', inflation: 'Decreases ~15%/yr toward 1.5% terminal', burn: '50% of tx fees burned' },
    technology: { problem: 'High-throughput low-latency chain for consumer apps', summary: 'PoH ঘড়ি ব্যবহার করে হাজার হাজার TPS — DeFi, NFT, gaming-এর জন্য জনপ্রিয়।' },
    earning: ['Staking (PoS)', 'Liquid staking (Jito/mSol)', 'Validator running (hardware-heavy)', 'DeFi yield', 'Trading'],
    risk: 'Past network outages (2021-22) documented; Rust-based — smaller auditor pool than EVM.',
  },
  {
    slug: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    emoji: '✕',
    basic: { launched: '2012 (XRP Ledger)', founder: 'Chris Larsen, Jed McCaleb, David Schwartz', website: 'xrpl.org' },
    creation: { consensus: 'XRPL Consensus (Federal Byzantine Agreement) — PoW/PoS নয়', blockchain: 'নিজস্ব XRP Ledger', openSource: true, note: 'Mining নেই — সব টোকেন শুরুতেই তৈরি।' },
    tokenomics: { supply: '100B created at launch — escrow releases control inflation', inflation: 'Circulating grows from escrow unlocks', burn: 'Small tx-fee burn per transaction' },
    technology: { problem: 'Fast cross-border settlement for institutions', summary: '৩-৫ সেকেন্ডে সেটেলমেন্ট, প্রতি লেনদেনে খরচ ভগ্নাংশ সেন্ট — ব্যাংক-ভিত্তিক পেমেন্ট রেল টার্গেট।' },
    earning: ['Trading (no staking/mining — consensus is permissioned to validators)', 'Payment-arbitrage services on XRPL', 'Building on XRPL (issuance, AMM)'],
    risk: 'SEC lawsuit history (partially resolved) — regulatory risk is the core XRP risk. Validator list permissioned.',
  },
  {
    slug: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    emoji: '₳',
    basic: { launched: '29 September 2017', founder: 'Charles Hoskinson (Ethereum co-founder)', website: 'cardano.org' },
    creation: { consensus: 'Ouroboros PoS (peer-reviewed)', blockchain: 'নিজস্ব Layer-1', openSource: true, note: 'Academic, paper-first development approach.' },
    tokenomics: { supply: '45B max cap', inflation: '~2-3% staking rewards, capped schedule', burn: 'No protocol burn — fee treasury model' },
    technology: { problem: 'Formally-verified, research-driven smart contract platform', summary: 'প্রতিটি আপগ্রেড peer-reviewed পেপার দিয়ে আসে — ধীর কিন্তু যত্নশীল ইঞ্জিনিয়ারিং।' },
    earning: ['Staking (no lockup — delegative PoS)', 'Running a stake pool', 'Trading', 'Building Plutus dApps'],
    risk: 'Slow ecosystem growth vs competitors; TVL/activity metrics historically lower than top chains. Educational research only.',
  },
  {
    slug: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    emoji: '🐕',
    basic: { launched: '6 December 2013', founder: 'Billy Markus & Jackson Palmer (parody coin)', website: 'dogecoin.com' },
    creation: { consensus: 'PoW (Scrypt) — merged mining with Litecoin', blockchain: 'নিজস্ব Layer-1 (Bitcoin fork)', openSource: true, note: 'Meme হিসেবে জন্ম — community-driven, no central dev company.' },
    tokenomics: { supply: 'NO cap — ~5B new DOGE per year forever', inflation: 'Fixed absolute emission → % inflation falls every year', burn: 'No protocol burn' },
    technology: { problem: 'Fun, cheap tips and micro-payments', summary: 'প্রযুক্তিগত উদ্ভাবন সীমিত — মূল্য community + ব্যবহার-রীতির উপর দাঁড়ানো।' },
    earning: ['Mining (Scrypt, merged with LTC)', 'Trading', 'Tips/community faucets (historical)'],
    risk: 'Infinite supply + sentiment-driven price. Classic high-volatility asset — treat as educational example, not investment.',
  },
  {
    slug: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    emoji: '⚡',
    basic: { launched: 'Mainnet 31 May 2018', founder: 'Justin Sun', website: 'tron.network' },
    creation: { consensus: 'Delegated Proof of Stake (27 Super Representatives)', blockchain: 'নিজস্ব Layer-1 (TVM ≈ EVM)', openSource: true, note: 'Ethereum VM-কম্প্যাটিবল — Solidity contracts port easily.' },
    tokenomics: { supply: 'Capped ~100B (mostly circulating)', inflation: 'Minimal net — rewards vs burn roughly balanced', burn: 'Tx fees largely burned' },
    technology: { problem: 'Cheap high-volume transfers — USDT carrier', summary: 'বিশ্বের সবচেয়ে বড় USDT পরিবহন নেটওয়ার্কগুলোর একটি — কম ফি-ই মূল আকর্ষণ।' },
    earning: ['Staking/voting for SRs', 'Running a Super Representative node', 'USDT liquidity on JustLend', 'Trading'],
    risk: 'Governance centralization (SR cartel dynamics); founder controversies documented. Research first.',
  },
  {
    slug: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    emoji: '⬤',
    basic: { launched: '26 May 2020', founder: 'Gavin Wood (Ethereum co-founder, Solidity author)', website: 'polkadot.network' },
    creation: { consensus: 'Nominated PoS (NPoS)', blockchain: 'Relay Chain + parachains', openSource: true, note: 'Substrate framework — chains built for the ecosystem.' },
    tokenomics: { supply: 'No max cap — ~dynamic, historically low net inflation', inflation: '10% gross annual, offset by staking — net depends on participation', burn: 'Slashed stakes burned; tx fees to treasury' },
    technology: { problem: 'Interoperability — many chains, one shared-security core', summary: 'Parachain নিজের চেইন চালায় Relay Chain-এর নিরাপত্তা ভাড়া নিয়ে — cross-chain messaging built-in (XCM)।' },
    earning: ['Staking/nominating (NPoS)', 'Parachain crowdloan rewards', 'Validator running', 'Trading'],
    risk: 'Parachain slot competition changing; ecosystem activity below early expectations. Educational research only.',
  },
  {
    slug: 'polygon',
    name: 'Polygon (POL)',
    symbol: 'POL',
    emoji: '⬡',
    basic: { launched: '2017 (Matic), rebranded 2024', founder: 'Jaynti Kanani, Sandeep Nailwal, Anurag Arjun', website: 'polygon.technology' },
    creation: { consensus: 'PoS chain + zkEVM rollups (AggLayer)', blockchain: 'Ethereum L2/sidechain family', openSource: true, note: 'Ethereum scaling suite — not a single chain anymore.' },
    tokenomics: { supply: 'POL migration from MATIC (10B cap)', inflation: 'Staking emissions fixed 2%/yr for PoS chain', burn: 'Fee burns on zkEVM expected as it matures' },
    technology: { problem: 'Ethereum-এর সস্তা, দ্রুত ভার্সন — একই নিরাপত্তার ছায়ায়', summary: 'PoS chain সস্তা EVM লেনদেন দেয়; zkEVM ভবিষ্যতের মূল — EVM ইকোসিস্টেমের বড় স্কেলার।' },
    earning: ['Staking POL (PoS chain)', 'zkEVM liquidity providing', 'Building dApps (EVM-identical)', 'Trading'],
    risk: 'L2 landscape competitive (Arbitrum/Base); bridge history had one incident (2022, since remediated). Research before use.',
  },
]

export const BUILD_LAB_LEVELS = [
  {
    level: 1,
    title: 'No-Code — ৫ মিনিটে টোকেন',
    price: 'ফ্রি গাইড',
    points: [
      'PancakeSwap Token Creator, Pinksale, CoinTool — ফর্ম পূরণ করেই BSC/Polygon-এ BEP-20 টোকেন',
      'মেটামাস্ক + ১-২ ডলার নেটওয়ার্ক ফি ছাড়া আর কিছু লাগে না',
      'লিকুইডিটি যোগ করে সোর্স লক — নইলে রাগ আসবে না (হানিপট সাবধান!)',
    ],
  },
  {
    level: 2,
    title: 'Low-Code — Remix IDE',
    price: 'ফ্রি টুল + কিছু ফি',
    points: [
      'Remix IDE-তে OpenZeppelin-এর ERC-20/BEP-20 কন্ট্রাক্ট কপি-কাস্টমাইজ-ডিপ্লয়',
      'টোকেনোমিক্স নিজে ঠিক করুন: supply, tax, burn, রিফ্লেকশন',
      'BSC Testnet-এ ফ্রি টেস্ট → মেইননেটে ডিপ্লয়',
    ],
  },
  {
    level: 3,
    title: 'Pro — Hostamar Consultancy',
    price: '$300–$2,000',
    points: [
      'Whitepaper + Tokenomics design + স্মার্ট কন্ট্রাক্ট অডিট রেফারেন্স + ওয়েবসাইট',
      'আপনার প্রজেক্টের রোডম্যাপ, কমিউনিটি প্ল্যান, এক্সচেঞ্জ লিস্টিং গাইডলাইন',
      'Hostamar-এর ১০৬ সার্ভিসের সাথে ব্র্যান্ডিং/ভিডিও/মার্কেটিং বান্ডল',
    ],
  },
]

export const COINLAB_INCOME = [
  'Affiliate — Binance, Bybit, Bitget রেফারেল কমিশন',
  'Sponsored listing — নতুন প্রজেক্টের রিসার্চ পেজ',
  'Premium research PDF — গভীর রিপোর্ট সাবস্ক্রিপশন',
  'Coin creation consultancy — $300–$2,000 (Build Lab Level 3)',
  'Hostamar সার্ভিস ক্রেডিট — প্রতিটি CoinLab কাস্টমার Hostamar ইকোসিস্টেমে যুক্ত হয়',
]

export const COINLAB_ROADMAP = [
  { phase: 'M1', what: 'MVP — Top 50 কয়েন রিসার্চ (বাংলা + English) — ৭ সেকশন টেমপ্লেট — এই পেজটাই শুরু (Top 10 লাইভ)' },
  { phase: 'M2', what: 'CoinGecko API 10/day ফ্রি টিয়ার — লাইভ প্রাইস/মার্কেট ক্যাপ অটো-আপডেট' },
  { phase: 'M3', what: 'Build Lab সম্প্রসারণ — YouTube টিউটোরিয়াল + meme coin কেস স্টাডি + কমিউনিটি রেটিং' },
]

export const COINLAB_LEGAL =
  '⚠️ আইনগত সতর্কতা: বাংলাদেশ ব্যাংক ক্রিপ্টোকারেন্সি ট্রেডিং/বিনিয়োগ অনুমোদন করে না। CoinLab BD সম্পূর্ণ শিক্ষামূলক রিসার্চ প্রজেক্ট — এটি বিনিয়োগ পরামর্শ নয়। নিজ দায়িত্বে গবেষণা করুন (DYOR)।'
