import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export const amountSchema = z
  .string()
  .trim()
  .refine((v) => /^\d*(\.\d+)?$/.test(v), "Enter a valid number")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

export function isValidBase58Mint(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
