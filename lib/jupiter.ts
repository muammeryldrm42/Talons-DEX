import { fetchWithRetry } from "@/lib/fetcher";
import { QuoteRoute } from "@/lib/types";

const QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
const SWAP_URL = "https://quote-api.jup.ag/v6/swap";

export type QuoteResponse = {
  data: QuoteRoute[];
};

export async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}) {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });

  return fetchWithRetry<QuoteResponse>(`${QUOTE_URL}?${qs.toString()}`);
}

export async function postSwap(body: {
  quoteResponse: QuoteRoute;
  userPublicKey: string;
  wrapAndUnwrapSol: boolean;
}) {
  return fetchWithRetry<{ swapTransaction: string }>(SWAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
