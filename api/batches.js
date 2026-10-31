import { getOnly, inParallel, integerParam, json, mapBatch, withChain } from "./_shared.js";
export const GET = getOnly(async url => {
  const page = integerParam(url.searchParams.get("page"), 0, 0, 100000);
  const size = integerParam(url.searchParams.get("size"), 8, 1, 12);
  return json(await withChain(async ({ provider, contract }) => {
    const blockNumber = await provider.getBlockNumber();
    const overrides = { blockTag: blockNumber };
    const n = await contract.getTotalBatches(overrides);
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("So lo vuot gioi han backend.");
    const total = Number(n);
    const start = total - (page * size);
    const indices = Array.from({ length: Math.min(size, Math.max(0, start)) }, (_, i) => start - i - 1);
    const items = await inParallel(indices, 3, async index => {
      const code = await contract.getBatchCodeByIndex(index, overrides);
      return mapBatch(await contract.getBatch(code, overrides));
    });
    return { page, size, total, items, blockNumber };
  }), 200, "public, s-maxage=10");
});
