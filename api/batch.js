import { getOnly, json, mapBatch, mapPoint, validCode, withChain } from "./_shared.js";
export const GET = getOnly(async url => {
  const code = validCode(url.searchParams.get("code"));
  const data = await withChain(async ({ contract, provider }) => {
    const blockNumber = await provider.getBlockNumber();
    const tag = { blockTag: blockNumber };
    const [batch, checkpoints] = await Promise.all([
      contract.getBatch(code, tag), contract.getCheckpoints(code, tag)
    ]);
    return { batch: { ...mapBatch(batch), checkpoints: checkpoints.map(mapPoint), blockNumber } };
  });
  return json(data, 200, "public, s-maxage=10");
});
