// API chi doc. Neu API khong san sang, client van doc true Sepolia truc tiep.
export class BackendReadClient {
  constructor(config) { this.config = config; this.connected = false; }

  async request(route, params = {}, timeoutMs = 8000) {
    const url = new URL(`api/${route}`, globalThis.location?.href || "http://localhost/");
    // Can noi vao goc domain, ke ca khi trang duoc mo voi query hoac hash.
    url.pathname = `/api/${route}`;
    url.search = new URLSearchParams(params).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`API HTTP ${response.status}`);
      const data = await response.json();
      if (data.ok !== true || data.source !== "sepolia-onchain" ||
          data.chainId !== this.config.chainId ||
          data.contractAddress?.toLowerCase() !== this.config.contractAddress.toLowerCase()) {
        throw new Error("Backend khong trung khop mang/contract cua frontend.");
      }
      return data;
    } finally { clearTimeout(timer); }
  }

  async probe() {
    try { await this.request("health", {}, 2200); this.connected = true; }
    catch { this.connected = false; }
    return this.connected;
  }
  async getPage(page, size) {
    const { total, items, blockNumber } = await this.request("batches", {page, size});
    return { total, items, blockNumber };
  }
  async getDetails(code) {
    const { batch } = await this.request("batch", {code});
    return batch;
  }
}
