import { Contract, FetchRequest, JsonRpcProvider, isAddress } from "ethers";
import { CONTRACT_ABI } from "../web/js/abi.js";

const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const DEFAULT_ADDRESS = "";
export const CHAIN_ID = 11155111;

export function integerParam(raw, fallback, min, max) {
  if (raw === null || raw === undefined) return fallback;
  if (!/^\d+$/.test(String(raw))) throw Object.assign(new Error("Tham so phai la so nguyen khong am."), { status: 400 });
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Object.assign(new Error(`Tham so phai tu ${min} den ${max}.`), { status: 400 });
  return n;
}

export function validCode(code) {
  if (typeof code !== "string" || !code.trim() || Buffer.byteLength(code, "utf8") > 64) {
    throw Object.assign(new Error("Ma lo phai co 1-64 byte UTF-8."), { status: 400 });
  }
  return code.trim();
}

export function validHash(hash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(hash))) {
    throw Object.assign(new Error("Ma giao dich khong hop le."), { status: 400 });
  }
  return hash;
}

export function json(data, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export function getOnly(handler) {
  return async function GET(request) {
    try { return await handler(new URL(request.url)); }
    catch (error) {
      const status = error.status || 503;
      console.error("HueLegend API:", error.message);
      return json({ ok: false, error: status >= 500 ? "Khong ket noi duoc du lieu Sepolia. Thu lai sau." : error.message }, status);
    }
  };
}

export function publicConfig() {
  const rpc = process.env.HUELEGEND_RPC_URL || DEFAULT_RPC;
  const contractAddress = process.env.HUELEGEND_CONTRACT_ADDRESS || DEFAULT_ADDRESS;
  if (!/^https:\/\//.test(rpc)) throw new Error("HUELEGEND_RPC_URL phai la HTTPS.");
  if (!isAddress(contractAddress)) throw Object.assign(new Error("Chua cau hinh HUELEGEND_CONTRACT_ADDRESS tren Sepolia."), { status: 503 });
  return { rpc, contractAddress };
}

export async function withChain(callback) {
  const { rpc, contractAddress } = publicConfig();
  const request = new FetchRequest(rpc);
  request.timeout = 9000;
  const provider = new JsonRpcProvider(request, undefined, { batchMaxCount: 1 });
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) throw new Error("RPC khong phai Sepolia.");
    if (await provider.getCode(contractAddress) === "0x") throw new Error("Dia chi chua co smart contract.");
    const contract = new Contract(contractAddress, CONTRACT_ABI, provider);
    const result = await callback({ provider, contract, contractAddress });
    return { ok: true, source: "sepolia-onchain", chainId: CHAIN_ID, contractAddress, ...result };
  } finally { provider.destroy(); }
}

export function mapBatch(b) {
  return {
    batchCode: b.batchCode, productName: b.productName, origin: b.origin,
    createdAt: Number(b.createdAt), producer: b.producer,
    isVerified: b.isVerified, exists: b.exists
  };
}
export function mapPoint(p) {
  return { timestamp: Number(p.timestamp), recorder: p.recorder, role: p.role,
    location: p.location, action: p.action, metadataURI: p.metadataURI };
}

export async function inParallel(items, limit, callback) {
  const output = Array(items.length);
  let at = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (at < items.length) { const index = at++; output[index] = await callback(items[index]); }
  }));
  return output;
}
