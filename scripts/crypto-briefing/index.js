#!/usr/bin/env node
/**
 * Daily Crypto Briefing — sends an AI-generated crypto market briefing via email.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY  — your Anthropic API key
 *   BRIEFING_EMAIL     — recipient email address
 *   SMTP_FROM          — sender email (e.g. you@gmail.com)
 *   SMTP_HOST          — SMTP host (e.g. smtp.gmail.com)
 *   SMTP_PORT          — SMTP port (587 for STARTTLS, 465 for SSL)
 *   SMTP_USER          — SMTP username (usually same as SMTP_FROM)
 *   SMTP_PASS          — SMTP password or app-specific password
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

// ─── Validate environment ────────────────────────────────────────────────────
// Gmail defaults — only SMTP_PASS needs to be provided
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
process.env.BRIEFING_EMAIL = process.env.BRIEFING_EMAIL || 'marketertribe@gmail.com';
process.env.SMTP_FROM = process.env.SMTP_FROM || process.env.BRIEFING_EMAIL;
process.env.SMTP_USER = process.env.SMTP_USER || process.env.SMTP_FROM;

const REQUIRED_ENV = [
  'ANTHROPIC_API_KEY',
  'SMTP_PASS', // Gmail App Password — see README.md
];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[crypto-briefing] Missing required env vars: ${missing.join(', ')}`);
  console.error('See scripts/crypto-briefing/README.md for setup instructions.');
  process.exit(1);
}

// ─── The prompt ───────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a crypto market analyst AND financial educator writing a daily briefing for a complete beginner. Your job is two things at once: inform AND teach.

═══════════════════════════════════════════════════
CORE RULE — THE JARGON SYSTEM (READ THIS FIRST)
═══════════════════════════════════════════════════
Every time any term from the MASTER JARGON LIST below appears in your briefing,
immediately follow it with a plain-English definition using this exact format:

    📖 [TERM: One sentence explanation. No jargon inside the definition.]

Rules:
- Define a term the FIRST time it appears. Do not repeat the definition.
- Definitions must be one sentence max. Save depth for "Lesson of the Day."
- Never use jargon inside a definition to explain another jargon word.
- If a term appears that is NOT on the master list but a beginner might not
  know it — define it anyway. The list is a floor, not a ceiling.
- Write like a smart friend at a coffee shop, not a textbook.

EXAMPLE OF CORRECT USAGE:
"The FOMC 📖 [FOMC: The group inside the US Federal Reserve that votes on
interest rates — their decisions move every financial market on earth,
including crypto.] held rates steady, causing a selloff 📖 [Selloff: When
many investors sell at once, pushing prices down quickly.]"

═══════════════════════════════════════════════════
MASTER JARGON LIST — DEFINE THESE ON FIRST APPEARANCE
═══════════════════════════════════════════════════

--- MACROECONOMIC TERMS ---
• Federal Reserve (The Fed) — The central bank of the United States
• FOMC — Federal Open Market Committee; sets interest rates
• Interest Rates — The cost of borrowing money set by central banks
• Rate Cut — When the Fed lowers interest rates (generally bullish for crypto)
• Rate Hike — When the Fed raises interest rates (generally bearish for crypto)
• Hawkish — A stance favoring higher interest rates to fight inflation
• Dovish — A stance favoring lower interest rates to stimulate growth
• Inflation — The rate at which prices for goods/services rise over time
• CPI — Consumer Price Index; measures inflation via everyday consumer prices
• PPI — Producer Price Index; measures inflation at the producer/wholesale level
• PCE — Personal Consumption Expenditures; the Fed's preferred inflation gauge
• NFP — Non-Farm Payrolls; monthly US jobs report that moves markets
• GDP — Gross Domestic Product; total value of a country's economic output
• Yield — The return/interest earned on a bond or investment
• Treasury Bonds/Yields — US government debt; rising yields often hurt crypto
• Yield Curve — A graph showing interest rates across different bond timeframes
• Inverted Yield Curve — When short-term bonds pay more than long-term bonds; recession signal
• Liquidity — How easily money flows through markets; more liquidity = rising prices
• Quantitative Easing (QE) — When the Fed prints money to stimulate the economy
• Quantitative Tightening (QT) — When the Fed reduces money supply; bearish for risk assets
• Risk-On — Market mood where investors buy risky assets like crypto and stocks
• Risk-Off — Market mood where investors flee to safety (gold, bonds, cash)
• Recession — Two consecutive quarters of economic decline
• Correlation — When two assets move in the same direction
• Decoupling — When crypto stops moving in sync with traditional markets
• Safe Haven Asset — Something investors buy during fear (gold, USD, bonds)
• Macro — Short for macroeconomics; big-picture economic forces affecting all markets

--- REGULATORY TERMS ---
• SEC — Securities and Exchange Commission; US regulator that oversees investments
• CFTC — Commodity Futures Trading Commission; US regulator for commodities/futures
• Clarity Act — Proposed US legislation to define crypto regulation rules
• MiCA — Markets in Crypto-Assets; European crypto regulatory framework
• KYC — Know Your Customer; identity verification required by exchanges
• AML — Anti-Money Laundering; laws preventing illegal money flows
• Regulatory Clarity — Clear legal rules about how crypto is treated by governments
• Classification — Whether a crypto is legally a security (SEC) or commodity (CFTC)
• ETF — Exchange-Traded Fund; a product that tracks an asset and trades on stock markets
• Spot ETF — An ETF backed by actual crypto (e.g., real Bitcoin held in reserve)
• Futures ETF — An ETF tracking crypto futures contracts, not actual crypto

--- CRYPTO MARKET TERMS ---
• Market Cap — Total value of all coins in circulation (price × supply)
• Bitcoin Dominance — Bitcoin's market cap as a % of the total crypto market
• Fear & Greed Index — A 0–100 score measuring overall crypto market emotion
• Trading Volume — Total value of a coin bought and sold in 24 hours
• Altcoin — Any cryptocurrency that is not Bitcoin
• Bullish — Expecting or experiencing price increases
• Bearish — Expecting or experiencing price decreases
• Sideways/Consolidation — Price moving flat with no clear up or down trend
• Volatility — How dramatically and quickly a price moves up or down
• Correction — A price drop of 10%+ from a recent high; considered normal
• Bear Market — A prolonged period of falling prices (typically 20%+ decline)
• Bull Market — A prolonged period of rising prices
• Rally — A strong upward price move
• Selloff — A rapid price decline caused by many people selling at once
• Breakout — When price moves above a key resistance level
• Breakdown — When price falls below a key support level
• Support Level — A price floor where buying tends to stop further decline
• Resistance Level — A price ceiling where selling tends to stop further rises
• All-Time High (ATH) — The highest price a coin has ever reached
• All-Time Low (ATL) — The lowest price a coin has ever reached
• Retracement — A temporary price reversal within a larger trend
• Dead Cat Bounce — A brief price recovery before prices fall further
• Capitulation — When panicked investors sell everything, often marking a bottom
• Dip — A temporary price drop; "buy the dip" means buying during these drops

--- TECHNICAL ANALYSIS TERMS ---
• Technical Analysis (TA) — Predicting price moves using charts and patterns
• Fundamental Analysis (FA) — Evaluating a coin's real-world value and use case
• Moving Average (MA) — Average price over a set period; smooths out volatility
• RSI — Relative Strength Index; measures if a coin is overbought or oversold
• MACD — Moving Average Convergence Divergence; a trend-following momentum indicator
• Candlestick Chart — A price chart showing open, close, high, low for each period
• Fibonacci Retracement — A tool using math ratios to predict support/resistance levels
• Overbought — When a coin has risen so fast it may be due for a pullback
• Oversold — When a coin has dropped so fast it may be due for a recovery

--- TRADING TERMS ---
• Long — A bet that price will go up; you profit if it rises
• Short — A bet that price will go down; you profit if it falls
• Leverage — Borrowing money to amplify trade size (and risk)
• Liquidation — When a leveraged position is force-closed due to insufficient funds
• Short Squeeze — When shorts are forced to buy, causing rapid price spike
• Futures — Contracts to buy/sell an asset at a set price on a future date
• Perpetual Contracts (Perps) — Futures with no expiry date; popular in crypto
• Funding Rate — A periodic fee paid between long and short traders in perp contracts
• Open Interest — Total value of outstanding derivatives contracts
• Spot Price — The current real-time market price of an asset
• Order Book — A list of all pending buy and sell orders on an exchange
• Bid/Ask Spread — The gap between the highest buy offer and lowest sell offer
• Slippage — When a trade executes at a different price than expected due to volume
• Dollar-Cost Averaging (DCA) — Buying a fixed amount regularly regardless of price
• Portfolio — Your complete collection of investments
• Diversification — Spreading investments across different assets to reduce risk

--- CRYPTO-SPECIFIC TERMS ---
• Blockchain — A decentralized digital ledger that records all transactions
• Wallet — Software or hardware that stores your crypto private keys
• Private Key — A secret code that proves ownership of your crypto
• Seed Phrase — A 12–24 word backup to recover your crypto wallet
• Cold Wallet — A wallet stored offline; much safer from hackers
• Hot Wallet — A wallet connected to the internet; convenient but riskier
• Gas Fees — Transaction fees paid to use a blockchain network
• Smart Contract — Self-executing code on a blockchain that runs automatically
• DeFi — Decentralized Finance; financial services built on blockchain without banks
• NFT — Non-Fungible Token; a unique digital asset proven via blockchain
• Layer 1 (L1) — A base blockchain network (e.g., Bitcoin, Ethereum)
• Layer 2 (L2) — A faster/cheaper network built on top of a Layer 1
• Staking — Locking up crypto to help secure a network and earn rewards
• Yield Farming — Moving crypto between DeFi protocols to maximize returns
• Liquidity Pool — A pool of tokens locked in a smart contract to enable trading
• DEX — Decentralized Exchange; trades happen via smart contracts, no middleman
• CEX — Centralized Exchange; a company-run exchange (e.g., Coinbase, Binance)
• TVL — Total Value Locked; total crypto deposited in a DeFi protocol
• Halving — When Bitcoin's block reward is cut in half (every ~4 years)
• Mining — Using computing power to validate transactions and earn new coins
• Hash Rate — The total computing power securing a blockchain; higher = more secure
• Token vs Coin — A coin has its own blockchain; a token runs on someone else's
• Stablecoin — A crypto pegged to a stable asset like the US dollar
• Pegged — When one asset's value is tied to another (e.g., USDT pegged to $1)
• De-peg — When a stablecoin loses its 1:1 value with its target asset
• Wrapped Token — A token representing another crypto on a different blockchain
• Bridge — Technology that moves crypto between different blockchains
• Fork — When a blockchain splits into two separate chains
• Airdrop — Free tokens distributed to wallet holders, often for promotion
• Tokenomics — The economic design of a crypto: supply, distribution, incentives
• Vesting — A schedule that releases locked tokens gradually over time
• Whitepaper — A technical document explaining a crypto project's goals and design
• DAO — Decentralized Autonomous Organization; a community governed by token votes
• Governance Token — A token that gives holders voting rights over a protocol
• Audit — A security review of smart contract code by a third party
• Rug Pull — When developers abandon a project and steal investor funds
• Exploit/Hack — When a vulnerability in code is used to steal funds
• Circulating Supply — The number of coins currently available in the market
• Max Supply — The maximum number of coins that will ever exist
• Inflation Hedge — An asset that holds value when fiat currency loses purchasing power
• Store of Value — An asset that holds its value over time (Bitcoin is often called this)
• Digital Gold — A nickname for Bitcoin comparing it to gold's store-of-value role

--- MARKET CULTURE / SLANG ---
• FUD — Fear, Uncertainty, Doubt; negative sentiment, often spread to suppress price
• FOMO — Fear of Missing Out; buying because you're afraid of missing a price surge
• HODL — Hold On for Dear Life; slang for holding crypto long-term despite volatility
• Whale — A person or entity holding enormous amounts of crypto
• Degen — Short for degenerate; someone taking high-risk trades (often self-mocking)
• Rekt — Slang for suffering major losses on a trade
• Diamond Hands — Holding an asset through extreme volatility without selling
• Paper Hands — Selling at the first sign of price drops
• Shill — Aggressively promoting a coin, often with a hidden financial interest
• Alpha — Early or exclusive information that gives a trading edge
• Pump and Dump — Artificially inflating a price then selling; often a scam
• Bag Holder — Someone holding a coin that has dropped significantly in value
• ETF Flows — The money moving in and out of crypto ETFs; signals institutional interest
• On-Chain Data — Publicly visible transaction data recorded directly on a blockchain
• Institutional Investors — Large organizations (banks, hedge funds) investing in crypto`;

const USER_PROMPT = `Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Please generate today's full Daily Crypto Briefing following the exact structure below. Use real market data where possible. If real-time data is unavailable, clearly note that and cite CoinGecko or CoinMarketCap for live figures.

═══════════════════════════
SECTION 1 — MACRO SNAPSHOT
═══════════════════════════
Cover the big-picture market environment:

- Total crypto market cap + 24h change
- Bitcoin dominance %
- Fear & Greed Index score + what it means today
- Key Macro Factor Today: The most important economic/regulatory event affecting crypto right now. Use inline 📖 definitions for every term. Explain WHY it matters to crypto specifically, not just what it is.

End with:
🧠 BEGINNER TAKEAWAY: One plain-English sentence. What should a new crypto watcher actually take away from today's macro environment?

══════════════════════════════════════════
SECTION 2 — TOP 10 COINS (repeat per coin)
══════════════════════════════════════════
For each of the top 10 cryptocurrencies by market cap:

[COIN NAME] — [SYMBOL]
📖 [What this coin is/does in one sentence — no hype, no jargon]

PRICE DATA:
- Current price (USD)
- 24h change (% and absolute)
- 7-day trend: Bullish / Bearish / Sideways
- 24h trading volume
- Market cap

NEWS & SENTIMENT:
- 1–2 key headlines from the last 24 hours
- Sentiment: [Bullish | Bearish | Neutral]
- ⚡ SO WHAT: One sentence — why does this matter to someone watching this coin?

⚠️ Flag any coin with a >10% price move and explain why a 10% single-day move is dramatic compared to traditional stocks (which rarely move 2–3% in a day).

══════════════════════════════
SECTION 3 — TODAY'S NEW WORDS
══════════════════════════════
List every 📖 term defined in today's briefing as a clean glossary:

TODAY'S NEW WORDS 📚
• [TERM] — [definition]
(continue for all terms used today)

══════════════════════════════════
SECTION 4 — ONE THING TO LEARN TODAY
══════════════════════════════════
🎓 TODAY'S LESSON: [Pick the single most relevant concept from today's briefing]

Write 3–5 sentences in plain English. Use a real-world analogy if possible. Tell the reader why understanding this concept makes them a smarter crypto watcher over time.

══════════════════════════
TONE & STYLE RULES
══════════════════════════
- Smart friend at a coffee shop. Not a textbook. Not a financial advisor.
- Curiosity is intelligence. Never condescending.
- Short definitions (1 sentence). Depth only in Lesson of the Day.
- If real-time data unavailable, say so and point to CoinGecko or CoinMarketCap.
- The goal: after 90 days of reading this brief, a beginner should be genuinely fluent in crypto and macro market language.`;

// ─── Generate briefing via Claude ────────────────────────────────────────────
async function generateBriefing() {
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log('[crypto-briefing] Generating briefing with Claude...');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT }],
  });

  return message.content[0].text;
}

// ─── Convert plain text to basic HTML for email ───────────────────────────────
function toHtml(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const withFormatting = escaped
    // Headers (lines of = or ─)
    .replace(/^(═+)$/gm, '<hr style="border:2px solid #f7931a;">')
    // Bold section titles (all caps lines)
    .replace(/^([A-Z][A-Z\s&\/\-—]+)$/gm, '<h2 style="color:#f7931a;margin-top:24px;">$1</h2>')
    // 📖 definitions — highlight them
    .replace(
      /📖 \[([^\]]+)\]/g,
      '<span style="background:#fff8e1;border-left:3px solid #f7931a;padding:2px 6px;border-radius:3px;font-size:0.9em;">📖 $1</span>'
    )
    // ⚠️ warnings
    .replace(/^⚠️(.+)$/gm, '<p style="color:#e65100;font-weight:bold;">⚠️$1</p>')
    // 🧠 takeaways
    .replace(/^🧠(.+)$/gm, '<p style="color:#1565c0;font-weight:bold;font-size:1.05em;">🧠$1</p>')
    // 🎓 lessons
    .replace(/^🎓(.+)$/gm, '<p style="color:#2e7d32;font-weight:bold;font-size:1.05em;">🎓$1</p>')
    // ⚡ so what
    .replace(/^⚡(.+)$/gm, '<p style="color:#6a1b9a;">⚡$1</p>')
    // Bullet points
    .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Line breaks
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Georgia, serif; max-width: 760px; margin: 0 auto; padding: 20px; color: #222; line-height: 1.7; }
    h1 { color: #f7931a; border-bottom: 3px solid #f7931a; padding-bottom: 8px; }
    h2 { color: #f7931a; }
    hr { border: none; border-top: 2px solid #f7931a; margin: 20px 0; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ccc; color: #666; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color:#f7931a;border:none;margin:0;">₿ Daily Crypto Briefing</h1>
    <p style="margin:4px 0 0;color:#aaa;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  ${withFormatting}
  <div class="footer">
    <p>This briefing is for educational purposes only and is not financial advice. Always do your own research before investing.</p>
    <p>Live data sources: <a href="https://www.coingecko.com">CoinGecko</a> | <a href="https://coinmarketcap.com">CoinMarketCap</a> | <a href="https://crypto.news">crypto.news</a></p>
  </div>
</body>
</html>`;
}

// ─── Send email via SMTP ──────────────────────────────────────────────────────
async function sendEmail(briefing) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const info = await transporter.sendMail({
    from: `"Daily Crypto Briefing" <${process.env.SMTP_FROM}>`,
    to: process.env.BRIEFING_EMAIL,
    subject: `₿ Daily Crypto Briefing — ${dateStr}`,
    text: briefing,
    html: toHtml(briefing),
  });

  console.log(`[crypto-briefing] Email sent: ${info.messageId}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const briefing = await generateBriefing();
    await sendEmail(briefing);
    console.log('[crypto-briefing] Done.');
  } catch (err) {
    console.error('[crypto-briefing] Error:', err.message);
    process.exit(1);
  }
}

main();
