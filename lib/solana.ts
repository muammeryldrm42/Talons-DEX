import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export async function getTokenBalances(connection: Connection, owner: PublicKey) {
  const [solLamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
  ]);

  const tokenMap = new Map<string, string>();
  tokenAccounts.value.forEach((acc) => {
    const info = acc.account.data.parsed.info;
    const mint = info.mint as string;
    const amount = info.tokenAmount.amount as string;
    tokenMap.set(mint, amount);
  });

  return { solLamports, tokenMap };
}

export async function getMintDecimals(connection: Connection, mint: string): Promise<number> {
  const account = await connection.getParsedAccountInfo(new PublicKey(mint));
  const data = account.value?.data;

  if (!data || !("parsed" in data)) {
    throw new Error("Mint account not found on devnet");
  }

  // @ts-expect-error parsed types are dynamic
  const decimals = data.parsed?.info?.decimals;
  if (typeof decimals !== "number") {
    throw new Error("Unable to read mint decimals");
  }

  return decimals;
}
