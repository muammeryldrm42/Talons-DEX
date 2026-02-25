export function decimalToBaseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d*(\.\d*)?$/.test(normalized) || normalized === "" || normalized === ".") {
    throw new Error("Invalid decimal amount");
  }

  const [whole = "0", frac = ""] = normalized.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${padded}`.replace(/^0+(?=\d)/, "") || "0";
  return BigInt(combined);
}

export function baseUnitsToDecimal(value: bigint | string, decimals: number): string {
  const str = typeof value === "bigint" ? value.toString() : value;
  const neg = str.startsWith("-");
  const unsigned = neg ? str.slice(1) : str;
  const padded = unsigned.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const frac = decimals > 0 ? padded.slice(-decimals).replace(/0+$/, "") : "";
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

export function formatDisplayAmount(value: string, max = 6): string {
  const [whole, frac] = value.split(".");
  if (!frac) return whole;
  return `${whole}.${frac.slice(0, max)}`.replace(/\.$/, "");
}
