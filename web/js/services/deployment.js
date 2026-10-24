import { isAddress } from "../lib/utils.js";

// Lay cau hinh public, khong nhan API key / private key tu backend.
export async function discoverContract({ mode, customConfig, origin, fetcher = fetch, timeoutMs = 2500 }) {
  if (mode !== "sepolia" || customConfig) return null;
  try {
    const result = await fetcher(new URL("/api/config", origin), {
      method: "GET", headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!result.ok) return null;
    const data = await result.json();
    if (data.ok !== true || data.source !== "deployment-config" ||
        data.chainId !== 11155111 || !isAddress(data.contractAddress)) return null;
    return data.contractAddress;
  } catch { return null; }
}
