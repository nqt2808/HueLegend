import { copyFile, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../",import.meta.url));
const dir = path.join(root,"web","vendor");
await mkdir(dir,{recursive:true});
const files = [
  ["ethers/dist/ethers.min.js","ethers.js"],
  ["qr-scanner/qr-scanner.min.js","qr-scanner.min.js"],
  ["qr-scanner/qr-scanner-worker.min.js","qr-scanner-worker.min.js"]
];
for (const [source,destination] of files) {
  const absolute = path.join(root,"node_modules",source);
  try { await access(absolute); } catch { throw new Error(`Thieu ${source}. Chay npm install truoc.`); }
  await copyFile(absolute,path.join(dir,destination));
}
for (const [name,file] of [["ethers","LICENSE.md"],["qr-scanner","LICENSE"]]) {
  try { await copyFile(path.join(root,"node_modules",name,file),path.join(dir,`${name}-LICENSE.txt`)); } catch {}
}
const manifest={localLibraries:true,ethers:"6.17.0",qrScanner:"1.4.2"};
await writeFile(path.join(dir,"manifest.json"),JSON.stringify(manifest,null,2));
console.log("Da chep ethers va QR Scanner vao web/vendor. Ban dung npm install de tai thu vien.");
