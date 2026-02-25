"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CLUSTER } from "@/lib/config";
import tokens from "@/data/tokens.json";
import { baseUnitsToDecimal, decimalToBaseUnits, formatDisplayAmount } from "@/lib/decimal";
import { getQuote, postSwap } from "@/lib/jupiter";
import { getMintDecimals, getTokenBalances } from "@/lib/solana";
import { ActivityItem, TokenInfo } from "@/lib/types";
import { amountSchema, isValidBase58Mint } from "@/lib/validation";
import { useDexStore } from "@/stores/dex-store";
import { VersionedTransaction } from "@solana/web3.js";

const curatedTokens = tokens as TokenInfo[];

export default function HomePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [customMintInput, setCustomMintInput] = useState("");
  const [statusText, setStatusText] = useState("Idle");
  const [error, setError] = useState<string>();

  const {
    fromToken,
    toToken,
    fromAmount,
    slippagePct,
    quote,
    activity,
    setFromToken,
    setToToken,
    setFromAmount,
    setSlippagePct,
    setQuote,
    pushActivity,
  } = useDexStore();

  const tokenOptions = useMemo(() => curatedTokens, []);

  const balancesQuery = useQuery({
    queryKey: ["balances", wallet.publicKey?.toBase58()],
    enabled: Boolean(wallet.publicKey),
    queryFn: async () => {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      return getTokenBalances(connection, wallet.publicKey);
    },
    refetchInterval: 15_000,
  });

  const fromBalance = useMemo(() => {
    if (!fromToken || !balancesQuery.data) return "0";
    if (fromToken.isNative) {
      return baseUnitsToDecimal(BigInt(balancesQuery.data.solLamports), 9);
    }
    const amount = balancesQuery.data.tokenMap.get(fromToken.mint) ?? "0";
    return baseUnitsToDecimal(amount, fromToken.decimals);
  }, [balancesQuery.data, fromToken]);



  const toBalance = useMemo(() => {
    if (!toToken || !balancesQuery.data) return "0";
    if (toToken.isNative) {
      return baseUnitsToDecimal(BigInt(balancesQuery.data.solLamports), 9);
    }
    const amount = balancesQuery.data.tokenMap.get(toToken.mint) ?? "0";
    return baseUnitsToDecimal(amount, toToken.decimals);
  }, [balancesQuery.data, toToken]);
  const getQuoteMutation = useMutation({
    mutationFn: async () => {
      setError(undefined);
      if (!fromToken || !toToken) throw new Error("Select both tokens");
      amountSchema.parse(fromAmount);
      const inputAmount = decimalToBaseUnits(fromAmount, fromToken.decimals);
      const slippage = Number(slippagePct);
      if (!Number.isFinite(slippage) || slippage <= 0) throw new Error("Invalid slippage");

      const result = await getQuote({
        inputMint: fromToken.mint,
        outputMint: toToken.mint,
        amount: inputAmount.toString(),
        slippageBps: Math.round(slippage * 100),
      });

      if (!result.data.length) {
        setQuote(undefined);
        throw new Error("No routes found on DEVNET for this pair and amount.");
      }

      setQuote(result.data[0]);
      return result.data[0];
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Quote failed");
    },
  });

  const swapMutation = useMutation({
    mutationFn: async () => {
      setError(undefined);
      if (!quote) throw new Error("Get a quote first");
      if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Connect a wallet");

      setStatusText("Pending");
      const { swapTransaction } = await postSwap({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
      });

      const raw = Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(raw);
      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      await connection.confirmTransaction(signature, "confirmed");
      setStatusText("Confirmed");
      return signature;
    },
    onSuccess: (signature) => {
      balancesQuery.refetch();
      addActivity("confirmed", signature);
    },
    onError: (err) => {
      setStatusText("Failed");
      const msg = err instanceof Error ? err.message : "Swap failed";
      setError(msg);
      addActivity("failed", undefined, msg);
    },
  });

  function addActivity(status: ActivityItem["status"], signature?: string, swapError?: string) {
    pushActivity({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      fromToken: fromToken?.symbol ?? "-",
      toToken: toToken?.symbol ?? "-",
      inAmount: fromAmount,
      outAmount: quote && toToken ? formatDisplayAmount(baseUnitsToDecimal(quote.outAmount, toToken.decimals)) : "-",
      status,
      signature,
      error: swapError,
    });
  }

  async function addCustomMint(target: "from" | "to") {
    setError(undefined);
    if (!isValidBase58Mint(customMintInput)) {
      setError("Custom mint is not a valid base58 Solana address");
      return;
    }
    try {
      const decimals = await getMintDecimals(connection, customMintInput);
      const token: TokenInfo = {
        symbol: "CUSTOM",
        name: `Custom ${customMintInput.slice(0, 4)}...${customMintInput.slice(-4)}`,
        mint: customMintInput,
        decimals,
        isCustom: true,
      };
      if (target === "from") setFromToken(token);
      else setToToken(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load custom mint");
    }
  }

  function setMax() {
    if (!fromToken) return;
    const bal = fromBalance;
    if (fromToken.isNative) {
      const lamports = decimalToBaseUnits(bal, 9);
      const buffer = decimalToBaseUnits("0.01", 9);
      if (lamports <= buffer) {
        setFromAmount("0");
        return;
      }
      setFromAmount(baseUnitsToDecimal(lamports - buffer, 9));
      return;
    }
    setFromAmount(bal);
  }

  const validationMessage = useMemo(() => {
    if (!fromToken) return "Select token";
    const parsed = amountSchema.safeParse(fromAmount || "0");
    if (!parsed.success) return parsed.error.issues[0]?.message;
    try {
      const amount = decimalToBaseUnits(fromAmount, fromToken.decimals);
      const balance = decimalToBaseUnits(fromBalance || "0", fromToken.decimals);
      if (fromToken.isNative) {
        const buffer = decimalToBaseUnits("0.01", 9);
        if (amount > balance - (balance > buffer ? buffer : balance)) {
          return "Amount exceeds available SOL after fee buffer";
        }
      } else if (amount > balance) {
        return "Amount exceeds balance";
      }
    } catch {
      return "Invalid amount";
    }
    return undefined;
  }, [fromAmount, fromBalance, fromToken]);

  const canSwap = Boolean(wallet.connected && quote && !validationMessage && !swapMutation.isPending);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devnet DEX Aggregator</h1>
          <p className="text-sm text-muted-foreground">Jupiter-powered terminal swap interface</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>DEVNET</Badge>
          <WalletMultiButton />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Swap Terminal</h2>

          <div className="grid gap-2 sm:grid-cols-2">
            <TokenSelect label="From" value={fromToken?.mint} onChange={(mint) => { const token = tokenOptions.find((t) => t.mint === mint); if (token) setFromToken(token); }} options={tokenOptions.filter((t) => !t.isCustom)} />
            <TokenSelect label="To" value={toToken?.mint} onChange={(mint) => { const token = tokenOptions.find((t) => t.mint === mint); if (token) setToToken(token); }} options={tokenOptions.filter((t) => !t.isCustom)} />
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              placeholder="Amount"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              inputMode="decimal"
            />
            <Button variant="outline" onClick={setMax}>Max</Button>
          </div>
          <p className="text-xs text-muted-foreground">From Balance: {formatDisplayAmount(fromBalance)} {fromToken?.symbol ?? ""}</p>
          <p className="text-xs text-muted-foreground">To Balance: {formatDisplayAmount(toBalance)} {toToken?.symbol ?? ""}</p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="Custom Mint Address"
              value={customMintInput}
              onChange={(e) => setCustomMintInput(e.target.value.trim())}
            />
            <Button variant="outline" onClick={() => addCustomMint("from")}>Set From</Button>
            <Button variant="outline" onClick={() => addCustomMint("to")}>Set To</Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <Input
              placeholder="Slippage %"
              value={slippagePct}
              onChange={(e) => setSlippagePct(e.target.value)}
            />
            <Button
              onClick={() => getQuoteMutation.mutate()}
              disabled={Boolean(validationMessage) || getQuoteMutation.isPending}
              title={validationMessage || "Fetch best route"}
            >
              {getQuoteMutation.isPending ? "Quoting..." : "Get Quote"}
            </Button>
          </div>

          {validationMessage && <p className="text-sm text-amber-300">{validationMessage}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <QuotePanel token={toToken} />

          <Button
            className="w-full"
            disabled={!canSwap}
            onClick={() => {
              addActivity("pending");
              swapMutation.mutate();
            }}
            title={!wallet.connected ? "Connect wallet" : !quote ? "Get a valid quote" : validationMessage || "Execute swap"}
          >
            {swapMutation.isPending ? "Swapping..." : "Swap"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Status: {statusText}
            {swapMutation.data && (
              <>
                {" · "}
                <a
                  className="text-cyan-300 underline"
                  href={`https://explorer.solana.com/tx/${swapMutation.data}?cluster=${CLUSTER}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Solana Explorer (devnet)
                </a>
              </>
            )}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-lg font-semibold">Activity (last 10)</h2>
          <div className="space-y-3">
            {activity.length === 0 && <p className="text-sm text-muted-foreground">No swap attempts yet.</p>}
            {activity.map((item) => (
              <div key={item.id} className="rounded border border-border p-2 text-xs">
                <p>{new Date(item.time).toLocaleString()} · {item.status.toUpperCase()}</p>
                <p>{item.fromToken} → {item.toToken} ({item.inAmount} / {item.outAmount})</p>
                {item.signature && (
                  <a
                    className="text-cyan-300 underline"
                    href={`https://explorer.solana.com/tx/${item.signature}?cluster=${CLUSTER}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.signature.slice(0, 10)}...
                  </a>
                )}
                {item.error && <p className="text-red-400">{item.error}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function TokenSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (mint: string) => void;
  options: TokenInfo[];
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="h-10 w-full rounded-md border border-border bg-card px-3"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>Select token</option>
        {options.map((token) => (
          <option key={token.mint || token.symbol} value={token.mint}>
            {token.symbol} — {token.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuotePanel({ token }: { token?: TokenInfo }) {
  const quote = useDexStore((s) => s.quote);
  const slippagePct = useDexStore((s) => s.slippagePct);

  if (!quote) {
    return <p className="text-sm text-muted-foreground">No quote loaded yet.</p>;
  }

  const expectedOut = token ? formatDisplayAmount(baseUnitsToDecimal(quote.outAmount, token.decimals)) : quote.outAmount;
  const minReceived = token
    ? formatDisplayAmount(baseUnitsToDecimal(quote.otherAmountThreshold, token.decimals))
    : quote.otherAmountThreshold;

  return (
    <div className="space-y-1 rounded border border-border bg-black/30 p-3 text-sm">
      <p>Expected Out: {expectedOut} {token?.symbol}</p>
      <p>Min Received ({slippagePct}%): {minReceived} {token?.symbol}</p>
      <p>Price Impact: {quote.priceImpactPct ? `${(Number(quote.priceImpactPct) * 100).toFixed(2)}%` : "N/A"}</p>
      <p>Route: {quote.routePlan?.map((r) => r.swapInfo?.label).filter(Boolean).join(" → ") || "Direct/Unknown"}</p>
    </div>
  );
}
