# HueLegend Fullstack: Frontend + API + MetaMask + Solidity

## 1. Muc tieu va ranh gioi tin cay

HueLegend la MVP truy xuat nguon goc dac san Hue. Lo hang, lich su chang, xac minh, so du ky quy, phi va phan quyen la du lieu on-chain, khong phai database do frontend tu quan ly. API la lop backend Node.js **chi doc** de phuc vu website Vercel; giao dich thay doi trang thai duoc MetaMask ky truc tiep, tuyet doi khong dua private key len server.

```
Nguoi mua    -> Website HTTPS (Vercel) -> GET /api/batch -> Sepolia RPC -> ProjectCore
Co so SX     -> Website -> MetaMask ky giao dich -> Sepolia -> ProjectCore
Quan tri     -> Website -> MetaMask owner -> grantRole / set fee / set fund
Thong tin bo sung, chung tu -> URI HTTPS/IPFS hoac sha256 trong checkpoint
```

Hinh anh/ho so goc **chua co dich vu upload file**, can upload len IPFS/HTTPS ben ngoai truoc va nhap URI hoac hash. API khong co database off-chain rieng; blockchain la nguon luu tru chinh. Khong nen goi he thong da xac minh chat luong san pham chi vi co ma QR.

## 2. Cac thanh phan source

| Thu muc/tep | Vai tro |
|---|---|
| `web/` | Frontend HTML/CSS/JS, QR, form theo vai tro, MetaMask qua Ethers v6 |
| `web/js/services/backend.js` | Chi nhan API neu chainId va dia chi contract trung voi frontend |
| `web/js/services/chain.js` | Doc/ghi on-chain, goi MetaMask, kiem tra network va receipt |
| `api/_shared.js` | Client Ethereum RPC backend, validation, serialization va loi |
| `api/health.js` | `GET /api/health`: kiem tra chain, contract va so lo |
| `api/batches.js` | `GET /api/batches?page=0&size=8`: trang danh sach on-chain |
| `api/batch.js` | `GET /api/batch?code=HL-...`: lo va checkpoints |
| `api/rules.js` | `GET /api/rules`: phi/coc/khoa/vai quan ly |
| `api/evidence.js` | `GET /api/evidence?code=...`: event trong 2000 block toi da |
| `api/tx.js` | `GET /api/tx?hash=0x...`: biên lai transaction (khong phai lenh ghi) |
| `contracts/ProjectCore.sol` | Smart contract **moi**, de deploy tren Sepolia sau khi test |
| `contracts/IProjectCore.sol` | Interface goc, khong deploy |
| `hardhat.config.ts` | Cấu hình compile/test Solidity 0.8.24 |
| `test/ProjectCore.t.sol` | Test EVM: lo hop le, mao danh, trung ma, unauthorized verify/checkpoint, qua dai, rut coc rong |

## 3. Chay local tren Windows PowerShell

Can Node.js >= 22.13 (Node 24 cua ban da du). Mo trong thu muc vua giai nen co `package.json`.

```powershell
node -v
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd start
```

Website: http://localhost:5173 . Backend: http://localhost:5173/api/health .

Nếu endpoint trả về 503 do RPC, phải kiểm tra kết nối Sepolia và địa chỉ hợp đồng. `npm start` dùng local server hỗ trợ `/api/` để chạy thử; bản deploy Vercel dùng serverless functions `api/*.js`.

## 4. Triển khai frontend + backend len Vercel

Trên máy đang đăng nhập Vercel:

```powershell
npx.cmd --yes vercel@latest deploy --prod
```

- Chọn team `nqt2808s-projects` hoặc team của bạn; **chọn project HueLegend đang có** để giữ domain, thay vì tạo project trùng.
- Root Directory: `./`, Build command: `npm run build`, Output Directory: `dist` (da co trong `vercel.json`). Framework: `Other`/khong phat hien framework la binh thuong.
- 2 bien moi truong server trong dashboard: `HUELEGEND_RPC_URL` (HTTPS RPC Sepolia) va `HUELEGEND_CONTRACT_ADDRESS` (dia chi contract). Biến default đã đặt trùng cấu hình README. Có thể giữ default để thử, nhưng cần xác minh bytecode thật.
- Khi thay bien env tren Vercel, deploy lai. Khong dua private key, seed phrase, API key co quyen ghi vao frontend.
- Sau deploy, truy cap `https://TEN-PROJECT.vercel.app/api/health`, `/api/batches?page=0&size=8`, `/api/rules`.

**Quan trong:** frontend hien co dia chi contract trong `web/js/config.js`. Neu doi hop dong, bat buoc doi cung dia chi trong bien moi truong Vercel, hoac tra cuu se bi chan do mismatch. Backend khong duoc tham so nguoi dung tu do chuyen RPC/contract.

## 5. Hop dong Solidity: hai lua chon

### A. Tiep tuc dung hop dong da deploy (uu tien neu no da dung)

Cau hinh README cu su dung Sepolia contract `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b`. Chua xac minh tai day bytecode/nguon/ABI so voi hop dong tren chain. **Khong deploy lai** neu co y dinh bao toan du lieu cu; tranh tao hai he thong khac nhau.

### B. Deploy `contracts/ProjectCore.sol` moi de kiem soat ma nguon

File nay la **mot implementation moi** duoc viet theo quy tac nghiep vu cua README va ABI frontend. Khong phai la ban sao bytecode hop dong cu. Loi thay doi do mo rong pham vi, quyen va phi can duoc nhom xem lai. Khong co tich thu coc hoac thuong to giac 50%, vi giao thuc phan xu chua duoc thong nhat.

Cach de nhat voi MetaMask la Remix:

1. Chay `npm.cmd install` sau do `npm.cmd run compile:contract`; Hardhat can tai compiler lan dau.
2. Mo https://remix.ethereum.org; copy `contracts/ProjectCore.sol` vao workspace, bat compiler Solidity 0.8.24, bat optimizer. Remix co the import `@openzeppelin/contracts` tu npm; neu khong resolve duoc, can cung cap ban OZ 5.x tai chinh workspace.
3. Trong MetaMask chon Sepolia, co mot it ETH **testnet** de tra gas; o Remix Environment chon `Injected Provider - MetaMask`.
4. Constructor `initialFund` nhap dia chi vi quy ETH testnet (co the dung vi nhom giai doan test). Khong nhap private key vao bat ky dau.
5. Deploy, xac minh giao dich tren https://sepolia.etherscan.io/, va doi dia chi trong `web/js/config.js` + `HUELEGEND_CONTRACT_ADDRESS`; build va redeploy web.
6. Tai giao dien ket noi MetaMask bang vi owner, cap ROLE_PRODUCER/LOGISTICS/RETAILER/INSPECTOR cho cac vi thu nghiem; thuc hien luong 3 buoc o muc 6.

**Can test Hardhat/EVM, kiem chung bytecode + source, va audit truoc khi dung tien that.** Solidity file moi duoc kiem tra so bo ve logic; chua duoc compile/test EVM trong moi truong tao file do khong tai duoc npm registry.

## 6. Luong demo du kien

1. Owner cap ROLE_PRODUCER cho vi A, ROLE_LOGISTICS cho vi B, ROLE_INSPECTOR cho vi C (ca 3 la MetaMask account tren Sepolia).
2. Vi A nap 0.05 test ETH trong muc Ky quy, tao lo HL-MEXUNG-2026-002, gui 0.001 test ETH phi tao lo + gas.
3. Vi B ghi nhan chang ban giao; vi C verify; nguoi dung khong can vi truy cap URL cong khai va quet QR de xem timeline. Thu revoke verify neu can.

Ca kiem thu gian lan: vi D khong duoc cap quyen thu tao lo, ghi chang, va verify. Phai bi revert tren contract, ke ca goi truc tiep ngoai giao dien. Ca kinh te: vi A nop thieu phi, nap khong du coc, hoac rut coc chua het han phai bi revert.

## 7. Co the chay kiem thu gi?

```powershell
npm.cmd test
npm.cmd run compile:contract
npm.cmd run test:contract
npm.cmd run build
```

- `npm test`: kiem tra UI/demo, xu ly loi va lua chon backend khi trung chain/contract. Khong phai kiem thu blockchain that.
- `test:contract`: test on Hardhat EVM cho implementation moi; can npm install.
- `GET /api/health`: xac minh RPC, chain ID, dia chi co code va goi getter. Khong phai kiem chung bytecode.
- Thu thuc te MetaMask: sai mang, tu choi ky, doi account giua giao dich, giao dich bi thay the, luong tao lo, canh bao QR localhost, thiet bi di dong.

## 8. Gioi han va bao mat

- API public khong phai he thong dang nhap. **Moi quyen ghi duoc kiem tra va cuong che boi contract**, khong phai boi role gia trong trinh duyet.
- Khong co upload tai lieu, DB PostgreSQL, indexer chay nen, cổng thanh toán VND, quan ly kho, oracle hoac co che phan xu/tich thu. Chu yeu la mot MVP on-chain co API doc.
- API events gioi han block de tranh ton phi va timeout; timeline trong contract (`getCheckpoints`) la nguon day du hon.
- Dung HTTPS tren Vercel; API chi chap nhan so va ma lo gioi han. RPC URL chi doc tu env, khong nhan URL nguoi dung.
- Hien tai frontend chua ho tro WalletConnect tren trinh duyet di dong khong co vi. Dung MetaMask in-app browser de ky tren dien thoai.
- Contract moi giu tham so `setStakeLockDuration(0)` theo ho so cu, owner co the cai dat 0: can policy ngan cam neu phat hanh that.
- `metadataURI` va hash la thong tin cong khai, khong luu du lieu rieng tu len blockchain.
