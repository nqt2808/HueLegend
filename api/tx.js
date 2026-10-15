import { getOnly, json, validHash, withChain } from "./_shared.js";
export const GET = getOnly(async url => {
  const hash = validHash(url.searchParams.get("hash"));
  return json(await withChain(async ({ provider }) => {
    const r = await provider.getTransactionReceipt(hash);
    return { transaction: r ? { hash: r.hash, blockNumber: r.blockNumber,
      status: r.status, from: r.from, to: r.to, gasUsed: r.gasUsed.toString() } : null,
    pendingOrUnknown: r === null };
  }));
});
