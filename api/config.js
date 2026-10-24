import { CHAIN_ID, getOnly, json, publicConfig } from "../server/shared.js";

// Chi cong khai dia chi smart contract va chain ID, khong cong khai RPC co API key.
export const GET = getOnly(async () => {
  const { contractAddress } = publicConfig();
  return json({
    ok: true, source: "deployment-config", chainId: CHAIN_ID, contractAddress,
    explorerUrl: "https://sepolia.etherscan.io"
  }, 200, "public, s-maxage=60");
});

export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return GET(request);
  }
};
