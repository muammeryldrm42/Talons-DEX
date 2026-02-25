import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ActivityItem, QuoteRoute, TokenInfo } from "@/lib/types";

type DexState = {
  fromToken?: TokenInfo;
  toToken?: TokenInfo;
  fromAmount: string;
  slippagePct: string;
  quote?: QuoteRoute;
  activity: ActivityItem[];
  setFromToken: (token: TokenInfo) => void;
  setToToken: (token: TokenInfo) => void;
  setFromAmount: (amount: string) => void;
  setSlippagePct: (value: string) => void;
  setQuote: (quote?: QuoteRoute) => void;
  pushActivity: (item: ActivityItem) => void;
};

export const useDexStore = create<DexState>()(
  persist(
    (set) => ({
      fromAmount: "",
      slippagePct: "0.5",
      activity: [],
      setFromToken: (fromToken) => set({ fromToken, quote: undefined }),
      setToToken: (toToken) => set({ toToken, quote: undefined }),
      setFromAmount: (fromAmount) => set({ fromAmount, quote: undefined }),
      setSlippagePct: (slippagePct) => set({ slippagePct, quote: undefined }),
      setQuote: (quote) => set({ quote }),
      pushActivity: (item) =>
        set((state) => ({ activity: [item, ...state.activity].slice(0, 10) })),
    }),
    {
      name: "dex-store",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
      partialize: (state) => ({
        fromToken: state.fromToken,
        toToken: state.toToken,
        slippagePct: state.slippagePct,
        activity: state.activity,
      }),
    },
  ),
);
