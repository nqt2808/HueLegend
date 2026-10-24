import { getOnly, integerParam, json, validCode, withChain } from "../server/shared.js";
export const GET = getOnly(async url => {
  const code = validCode(url.searchParams.get("code"));
  const lookback = integerParam(url.searchParams.get("blocks"), 1600, 1, 2000);
  return json(await withChain(async ({ contract, provider }) => {
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - lookback + 1);
    const logs = [];
    for (let start = fromBlock; start <= latest; start += 400) {
      const end = Math.min(latest, start + 399);
      const events = await contract.queryFilter(contract.filters.CheckpointAdded(code), start, end);
      for (const item of events) {
        logs.push({ hash: item.transactionHash, blockNumber: item.blockNumber,
          logIndex: item.index, timestamp: Number(item.args.timestamp), recorder: item.args.recorder,
          role: item.args.role, action: item.args.action, location: item.args.location });
      }
    }
    return { logs, fromBlock, toBlock: latest, partialHistory: fromBlock !== 0 };
  }), 200, "public, s-maxage=10");
});

// Tuong thich Vercel Web Handler; may chu local van goi GET truc tiep.
export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return GET(request);
  }
};
