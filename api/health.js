import { getOnly, json, withChain } from "./_shared.js";
// API chi doc: khong co private key va khong ky thay vi MetaMask.
export const GET = getOnly(async () => json(await withChain(async ({ contract, provider }) => ({
  latestBlock: await provider.getBlockNumber(),
  totalBatches: Number(await contract.getTotalBatches())
})), 200, "public, s-maxage=10"));
