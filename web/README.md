# HueLegend - ban web duoc dong bo tu Vite

Thu muc `web/` la **ban website da build** de xem hoac phat hanh static. Ma nguon React/TypeScript goc van nam tai `src/`, `public/`, `index.html` va `vite.config.ts` o thu muc HueLegend goc.

## Dong bo web sau moi lan sua code

Tai thu muc HueLegend goc, chay:

```powershell
npm.cmd run build:web
```

Lenh nay bien dich contract, kiem tra TypeScript, build Vite va cap nhat `web/index.html`, `web/assets/`, `web/generated/` theo ban moi nhat. Hinh anh, font va bundle JS/CSS duoc dong bo. Cac file cu tu lan build truoc chi bi xoa neu khong co thay doi rieng; file do nguoi dung sua duoc sao luu trong `web-backups/` truoc khi bi ghi de.

Xem thu bang Vite:

```powershell
npx.cmd vite preview --outDir web --host 127.0.0.1 --port 4173
```

Truy cap `http://localhost:4173/`. Sau khi cap nhat, nhan `Ctrl+Shift+R` de trinh duyet tai ban JS/CSS moi.

**Luu y:** `web/` chi la frontend static. Cac endpoint `/api/*` can backend rieng. Website van dung dia chi smart contract Sepolia da cau hinh; build web khong trien khai hop dong moi va khong tu cap quyen blockchain.
