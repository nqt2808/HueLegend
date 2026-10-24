let manifestPromise;
function manifest() {
  return manifestPromise ||= fetch(new URL("../../vendor/manifest.json", import.meta.url))
    .then(response => response.ok ? response.json() : { localLibraries: false })
    .catch(() => ({ localLibraries: false }));
}
function timeout(promise, milliseconds = 18000) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Tải thư viện quá lâu. Chạy npm install để dùng thư viện cục bộ.")), milliseconds);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
let ethersPromise, scannerPromise;
export async function loadEthers() {
  if (!ethersPromise) ethersPromise = (async () => {
    const info = await manifest();
    const url = info.localLibraries
      ? new URL("../../vendor/ethers.js", import.meta.url).href
      : "https://cdn.jsdelivr.net/npm/ethers@6.17.0/dist/ethers.min.js";
    return timeout(import(url));
  })().catch(error => { ethersPromise = null; throw error; });
  return ethersPromise;
}
export async function loadScanner() {
  if (!scannerPromise) scannerPromise = (async () => {
    const info = await manifest();
    const url = info.localLibraries
      ? new URL("../../vendor/qr-scanner.min.js", import.meta.url).href
      : "https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js";
    const module = await timeout(import(url)); return module.default;
  })().catch(error => { scannerPromise = null; throw error; });
  return scannerPromise;
}
