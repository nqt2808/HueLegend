import { getOnly, json, withChain } from "../server/shared.js";
export const GET = getOnly(async () => json(await withChain(async ({ contract, provider }) => {
  const [fee, minStake, maxFee, lock, owner, ecosystemFund, maxCheckpoints, blockNumber] = await Promise.all([
    contract.batchCreationFee(), contract.MIN_STAKE_AMOUNT(), contract.MAX_BATCH_FEE_LIMIT(),
    contract.stakeLockDuration(), contract.owner(), contract.ecosystemFund(),
    contract.MAX_CHECKPOINTS_PER_BATCH(), provider.getBlockNumber()
  ]);
  return { rules: { feeWei: fee.toString(), minStakeWei: minStake.toString(),
    maxFeeWei: maxFee.toString(), lockSeconds: Number(lock), owner, ecosystemFund,
    maxCheckpoints: Number(maxCheckpoints) }, blockNumber };
}), 200, "public, s-maxage=10"));

// Tuong thich Vercel Web Handler; may chu local van goi GET truc tiep.
export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return GET(request);
  }
};
