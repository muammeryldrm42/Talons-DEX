export type TokenInfo = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  isNative?: boolean;
  isCustom?: boolean;
};

export type ActivityItem = {
  id: string;
  time: string;
  fromToken: string;
  toToken: string;
  inAmount: string;
  outAmount: string;
  status: "pending" | "confirmed" | "failed";
  signature?: string;
  error?: string;
};

export type QuoteRoute = {
  outAmount: string;
  inAmount: string;
  otherAmountThreshold: string;
  priceImpactPct?: string;
  routePlan?: Array<{
    swapInfo?: {
      label?: string;
    };
  }>;
};
