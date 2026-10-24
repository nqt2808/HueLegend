# HueLegend Fullstack tren Vercel

Sau khi deploy, backend API song song voi frontend tai `/api/health`, `/api/batches`, `/api/batch`, `/api/rules`, `/api/evidence`, `/api/tx`. Xem [docs/FULLSTACK.md](docs/FULLSTACK.md) de biet chi tiet. `vercel.json` va `api/` nam o **thu muc goc** cung `package.json`.

**Quan trong:** contract da deploy tu truoc khong tu dong thay doi; Vercel chi deploy frontend va backend API, KHONG deploy Solidity len blockchain.

---

# HueLegend - huong dan dua len Vercel

## 1. Giai nen dung cau truc

File ZIP `HueLegend-Vercel-Ready.zip` nay da duoc dong goi de `package.json` va `vercel.json` nam NGAY O THU MUC GOC khi giai nen, khong co hai thu muc HueLegend-DApp long nhau.

Vi du, giai nen vao `C:\Users\Admin\Downloads\HueLegend-Vercel`. Mo PowerShell:

```powershell
cd "$env:USERPROFILE\Downloads\HueLegend-Vercel"
dir package.json
```

Nhap phan **lenh** sau dau nhac PowerShell; KHONG nhap lai `PS C:\...>`.

## 2. Deploy truc tiep (khong can chay localhost)

May can Node.js va npm. Kiem tra:

```powershell
node -v
npm.cmd -v
```

Dang nhap bang trinh duyet:

```powershell
npx.cmd --yes vercel@latest login
```

Deploy production:

```powershell
npx.cmd --yes vercel@latest deploy --prod
```

Lan dau Vercel co the hoi:
- Set up and deploy? -> Y
- Which scope? -> chon tai khoan Vercel cua ban
- Link to existing project? -> N (neu chua co)
- Project name? -> `huelegend-dapp`
- Directory containing code? -> `./`
- Override settings? -> N (da co vercel.json)

Cho Vercel thong bao `Production:` va URL dang `https://...vercel.app`.

## 3. Neu muon chay thu truoc

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Mo http://localhost:5173. `npm.cmd start` phai chay trong thu muc co package.json.

## 4. Khi import repo qua Dashboard

- Dashboard -> Add New... -> Project -> Import Git Repository.
- Root Directory: folder chua package.json.
- Framework Preset: Other.
- Build Command: npm run build.
- Output Directory: dist.
- Install Command: npm install.

`vercel.json` trong repo da dinh nghia cac gia tri nay.

## 5. Luu y

- Cac trang giao dien public duoc luu tai Vercel, KHONG tu deploy smart contract.
- Chon che do Demo de xem du lieu mau, chon Sepolia de doc/ghi on-chain.
- Dia chi hop dong lay tu README cua nhom, can kiem tra lai tren explorer truoc khi nap ETH.
- Khong dua private key, seed phrase, mat khau hay token Vercel vao chat, code hoac source.
- Tao QR tu URL tren Vercel sau khi website duoc cong khai; QR localhost khong dung cho nguoi khac.
