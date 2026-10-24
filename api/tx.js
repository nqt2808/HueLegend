import { getOnly, json, validHash, withChain } from "../server/shared.js";
export const GET = getOnly(async url => {
  const hash = validHash(url.searchParams.get("hash"));
  return json(await withChain(async ({ provider }) => {
    const r = await provider.getTransactionReceipt(hash);
    return { transaction: r ? { hash: r.hash, blockNumber: r.blockNumber,
      status: r.status, from: r.from, to: r.to, gasUsed: r.gasUsed.toString() } : null,
    pendingOrUnknown: r === null };
  }));
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
