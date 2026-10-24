import { getOnly, json, withChain } from "../server/shared.js";
// API chi doc: khong co private key va khong ky thay vi MetaMask.
export const GET = getOnly(async () => json(await withChain(async ({ contract, provider }) => ({
  latestBlock: await provider.getBlockNumber(),
  totalBatches: Number(await contract.getTotalBatches())
})), 200, "public, s-maxage=10"));

// Tuong thich Vercel Web Handler; may chu local van goi GET truc tiep.
export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return GET(request);
  }
};
