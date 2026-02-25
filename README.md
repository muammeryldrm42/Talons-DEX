# Devnet DEX Aggregator (Jupiter v6)

A production-oriented Solana **DEVNET-only** DEX Aggregator web app built with Next.js 14, Jupiter public APIs, and Solana Wallet Adapter.

## Features

- Wallet connect (Phantom/Solflare via wallet adapter)
- DEVNET token balances (SOL + SPL)
- Jupiter quote + swap (no paid API keys)
- Bigint-safe amount conversions (precision-safe)
- Custom mint support (base58 validation + on-chain decimals lookup)
- Swap status tracking + devnet explorer links
- Last 10 swap attempts stored in localStorage
- Terminal-style premium dark UI

## No API keys required

This app uses Jupiter's public v6 endpoints:

- `https://quote-api.jup.ag/v6/quote`
- `https://quote-api.jup.ag/v6/swap`

No paid API keys are required.

## Install & run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` into `.env.local` if desired.

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_CLUSTER=devnet
```

> App behavior is hard-wired to DEVNET UX and links.


## Vercel deployment

- Set **Node.js 20+** in Vercel project settings.
- Build command: `npm run build` (or `npm run vercel-build`).
- Install command: `npm install`.

If Vercel logs show `npm run` without a script name, update Build Command to `npm run build`.

## DEVNET troubleshooting

- Ensure wallet network is set to **Devnet**.
- Airdrop SOL for gas (CLI or wallet tools).
- Some devnet mints have thin/no liquidity. Use **Custom Mint Address** when needed.
- If quote says no routes, try a smaller amount, different pair, or a liquid devnet token.

## Security notes

- The app never requests or stores seed phrases.
- Transactions are signed only through wallet adapter.
- User inputs are validated before quote/swap calls.
