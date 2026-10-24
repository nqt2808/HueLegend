import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(fileURLToPath(new URL("../web/", import.meta.url)));
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
// Dung cung API route voi Vercel khi chay o may ca nhan.
const apiRoutes = new Set(["health", "batches", "batch", "rules", "tx", "evidence", "config", "market-config", "market-health", "market-products", "market-product"]);
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".txt":"text/plain; charset=utf-8" };
const server = http.createServer(async (request, response) => {
  try {
    if (!["GET","HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const match = pathname.match(/^\/api\/([a-z-]+)$/);
    if (match && apiRoutes.has(match[1])) {
      try {
        const mod = await import(`../api/${match[1]}.js`);
        const apiResponse = await mod.GET(new Request(url.href));
        response.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers.entries()));
        response.end(Buffer.from(await apiResponse.arrayBuffer()));
      } catch (error) {
        console.error("Local API:", error.message);
        response.writeHead(503, {"Content-Type":"application/json"});
        response.end(JSON.stringify({ok:false,error:"Can cai npm install de bat backend API."}));
      }
      return;
    }
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403); response.end("Forbidden"); return; }
    if ((await stat(target)).isDirectory()) target = path.join(target,"index.html");
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
      "Cache-Control":"no-cache", "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer", "Permissions-Policy":"camera=(self), microphone=()"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"}); response.end("Khong tim thay tep."); }
});
server.on("error", error => { console.error("Khong mo duoc server:",error.message); process.exitCode=1; });
server.listen(port,host,()=>console.log(`HueLegend: http://${host}:${port}\nNhan Ctrl+C de dung. Khong can npm install de xem che do mau.`));
