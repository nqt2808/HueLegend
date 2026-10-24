import { isAddress } from "../web/js/lib/utils.js";

// Kiem tra endpoint public; khong dung private key, khong ky giao dich.
const base = process.argv[2];
if (!base) {
  console.error("Cach dung: npm run check:deployment -- https://ten-project.vercel.app");
  process.exit(2);
}
let origin;
try {
  const url = new URL(base);
  if (url.protocol !== "https:") throw new Error("Phai dung HTTPS");
  origin = url.origin;
} catch (error) { console.error("URL khong hop le:",error.message);process.exit(2); }

let failures = 0;
async function inspect(name, path, validator) {
  try {
    const response = await fetch(origin + path, {signal:AbortSignal.timeout(14000),headers:{Accept:"application/json"}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = path==="/" ? await response.text() : await response.json();
    if (!validator(data)) throw new Error("Phan hoi sai schema / hop dong");
    console.log(`[PASS] ${name}`);
    return data;
  } catch (error) { failures++;console.error(`[FAIL] ${name}: ${error.message}`);return null; }
}
const config = await inspect("Website", "/", html => /HueLegend/i.test(html));
const deployment = await inspect("API contract config", "/api/config", d => d.ok===true && d.source==="deployment-config" && d.chainId===11155111 && isAddress(d.contractAddress));
const health = await inspect("API on-chain health", "/api/health", d => d.ok===true && d.source==="sepolia-onchain" && d.chainId===11155111 && Number.isInteger(d.totalBatches) && isAddress(d.contractAddress));
if (deployment && health && deployment.contractAddress.toLowerCase()!==health.contractAddress.toLowerCase()){
  failures++;console.error("[FAIL] Frontend config va on-chain backend khac dia chi contract");
}
console.log(`Ket qua: ${3-failures}/3 kiem tra co ban; ${failures} loi.`);
if (failures) process.exitCode=1;
