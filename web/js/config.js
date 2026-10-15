// Chi cau hinh RPC cong khai. Khong dat khoa bi mat trong frontend.
export const DEFAULT_CONFIG = Object.freeze({
  chainId: 11155111,
  chainHex: "0xaa36a7",
  chainName: "Ethereum Sepolia",
  contractAddress: "0x35655079aebb215e58e379d5a8c2f1f3a5323c6b",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  explorerUrl: "https://sepolia.etherscan.io",
  pageSize: 8,
  eventLookback: 5000,
  eventChunk: 1000,
  defaultMode: "demo"
});

export const STORAGE_KEYS = Object.freeze({
  config: "huelegend:config:v1",
  demo: "huelegend:demo:v1",
  mode: "huelegend:mode:v1",
  pending: "huelegend:pending:v1"
});

export function loadConfig(storage) {
  try {
    const backing = storage ?? globalThis.localStorage;
    const saved = JSON.parse(backing?.getItem(STORAGE_KEYS.config) || "{}");
    return { ...DEFAULT_CONFIG,
      contractAddress: typeof saved.contractAddress === "string" ? saved.contractAddress : DEFAULT_CONFIG.contractAddress,
      rpcUrl: typeof saved.rpcUrl === "string" ? saved.rpcUrl : DEFAULT_CONFIG.rpcUrl
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
