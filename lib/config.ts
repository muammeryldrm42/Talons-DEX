export const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

export const CLUSTER = "devnet";

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || DEFAULT_RPC_URL;
