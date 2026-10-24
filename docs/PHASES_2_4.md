# HueLegend | Giai doan 2-4 (15/10/2026)

**Trang thai:** Source code da duoc nang cap. Chua deploy truc tiep tu tai khoan GitHub/Vercel cua nguoi dung; chua ky giao dich MetaMask hay deploy contract moi. Cac test Solidity phai duoc chay tren EVM truoc khi su dung contract moi.

## Giai doan 2: GitHub + Vercel + backend API

1. Tai `HueLegend-Phases-2-4.zip` va giai nen *de* vao `C:\Users\Admin\Downloads\HueLegend` (giu `.git` san co). Ban sao moi khong chua `.git`, `.env`, `node_modules`, `dist`.
2. Xoa tep cu `api/_shared.js` neu con lai. Phan dung chung da duoc chuyen vao `server/shared.js` de `/api` chi co cac function thuc su.
3. Chay `npm.cmd install`, `npm.cmd test`, `npm.cmd run build`.
4. `git status`, `git add .`, `git commit -m "feat: sync Vercel contract config and add CSV export"`, `git push origin main`.
5. Link thu muc hien tai vao **dung project Vercel da co** trong team `nqt2808s-projects`: `npx.cmd --yes vercel@latest link` (chon existing project, dung tao project moi). Sau do `npx.cmd --yes vercel@latest git connect` de noi remote GitHub `nqt2808/HueLegend` voi Vercel project dang link. Lenh Git connect doi hoi tai khoan Vercel co quyen voi repo GitHub.
6. Trong project Vercel -> Settings -> Environment Variables, cau hinh: `HUELEGEND_RPC_URL` (Sepolia HTTPS RPC, co the la private key URL tren server) va `HUELEGEND_CONTRACT_ADDRESS` (dia chi **smart contract**, khong phai dia chi vi) cho Production va Preview neu can. Uu tien hop dong da duoc xac minh ABI/bytecode.
7. Deploy preview qua `npx.cmd --yes vercel@latest deploy`. Sau khi kiem tra preview, deploy production qua `npx.cmd --yes vercel@latest deploy --prod`, hoac dung auto deploy tu nhanh `main` neu ket noi git da hoat dong.
8. Trong website, `/api/config` tra ve public contract address (khong lo private RPC). `/api/health` tra ve so lo va block Sepolia. Kiem tra bang `npm.cmd run check:deployment -- https://DOMAIN-THAT.vercel.app`.

> Chon dung project Vercel o buoc 5: CLI truoc do da tao website duoi team nqt2808s-projects, nhung ten project chinh xac chua duoc xac nhan. Khong tu dong go nham vao mot project khac.

## Giai doan 3: MetaMask & Solidity

- Contract nguon: `contracts/ProjectCore.sol` (source moi, **KHONG PHAI** bytecode cua dia chi Sepolia goc trong README).
- ABI: `web/js/abi.js` la ABI ma frontend dang dung; mo rong de test khop voi contract da deploy. **Khong tu chuyen nguon frontend sang mot dia chi moi khi chua verify**.
- Chay `npm.cmd run compile:contract` va `npm.cmd run test:contract` tren may co Internet. Workflow `.github/workflows/solidity-manual.yml` co the chay thu cong trong GitHub Actions.
- Neu muon deploy contract moi, dung vi MetaMask tren **Sepolia**, kiem tra network chain ID `11155111`, fund wallet va khoi tao `ecosystemFund` (dia chi nhan phi). Trien khai co chi phi test ETH. Dung Remix/Hardhat cua ban, xac minh source tren Etherscan, khong can nhap recovery phrase vao repository/chat.
- Chi sau khi verify ABI+bytecode, cap nhat `HUELEGEND_CONTRACT_ADDRESS` tren Vercel. Frontend se tu doc dia chi tu `/api/config` neu nguoi dung chua tu luu config trong trinh duyet.
- Quan trong: Trinh duyet tung luu config thu cong se tiep tuc uu tien config do. Vao Cai dat, chon dung dia chi moi hoac xoa config cu.

### Test end-to-end bat buoc

1. Owner cap `ROLE_PRODUCER` -> producer stake >= 0.05 Sepolia ETH -> `createBatch()` thu dung 0.001 ETH -> QR khai bao dung dia chi -> `/api/batch?code=...` doc lai du lieu.
2. Wallet `ROLE_LOGISTICS` them checkpoint; wallet `ROLE_INSPECTOR` xac minh; nguoi dung cong khai tra cuu khong can MetaMask. Soi txHash tren Etherscan.
3. **Gian lan:** Vi khong co quyen tao lo va chen checkpoint bi revert, cung khong duoc thay doi lich su.
4. `withdrawStake` truoc khi dao han phai revert; phi vuot tran va ma lo trung phai revert.
5. Chuyen MetaMask sang mang khac -> frontend can bao sai mang, khong gui giao dich len wrong chain.

### Rui ro con ton tai trong Solidity v1

- Cac vi cung role co the ghi checkpoint vao bat ky lo nao; chua rang buoc don vi giao/nhan theo tung lo hay thu tu san xuat -> van chuyen -> ban le.
- Producer co the rut stake sau thoi gian khoa du cho lo van dang luu hanh.
- Chua co co che cho nguoi mua phan anh gian lan / giai quyet tranh chap.
- QR co the bi sao che tu bao bi hop le len hang gia.
- Chua co audit doc lap. **Khong trien khai mainnet hay dung ETH that** khi chua quyet dinh lai chinh sach va kiem toan.

## Giai doan 4: UX, du lieu va nang cap

**Da co trong ban nay:**
- `/api/config` public de dong bo contract address tu backend; RPC co API key khong bi dua ra JSON public.
- Cac routes `/api/*.js` co Web Handler cho Vercel va local GET.
- Dashboard them nut **Xuat trang CSV** (chi cac lo tren trang dang hien thi), kem cot danh dau `DU LIEU MAU`/`SEPOLIA`; gia tri CSV duoc escape de tranh Excel formula injection.
- Script `check:deployment` de kiem tra frontend, API config va health theo URL deploy.
- Them JS regression tests cho config cross-chain, CSV, va 5 Solidity test-case ve role/verify/fee (chua chay EVM).

**De xuat uu tien tiep:**
1. Xay `ProjectCoreV2` co gan vi giao/nhan theo tung lo, trang thai su kien va buoc ket thuc lo truoc khi mo khoa stake; thong nhat chinh sach kinh te truoc khi viet va deploy.
2. Chu ky QR theo don vi san pham + tem niem phong vat ly; canh bao quet bat thuong, khong cam ket chong sao che tuyet doi.
3. Storage minh chung (Vercel Blob / IPFS gateway) + hash SHA-256 on-chain; bat buoc kiem tra nguoi tai va quyen truy cap.
4. PostgreSQL/indexer cho tim kiem so luong lon; blockchain la nguon su that, indexer chi la ban sao phuc vu truy van.
5. Dang nhap SIWE voi nonce, timestamp, domain, chainId va session cho dashboard off-chain; van phai giu RBAC on-chain.
6. Logging, monitoring, rate-limit cho API, backup/rollback, CI EVM bat buoc truoc khi phat hanh.

## Lenh kiem tra danh gia trong moi truong tao file

- `npm test`: **26/26 PASS**.
- `npm run build`: **PASS** (can `npm install` tren may co Internet de copy thu vien ethers/qr-scanner vao vendor, neu khong ban build dung CDN).
- `node --check` tren cac module JS thay doi: **PASS**.
- `npm run test:contract`: **CHUA CHAY** do moi truong khong cai duoc dependencies tu npm registry.
- `vercel deploy`, `git push`: **CHUA THUC HIEN** do chua co ket noi tai khoan cua nguoi dung trong session nay.
