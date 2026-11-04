# HueLegend: Quan ly han su dung bang Sepolia + IPFS (buoc 1)

## 1. He thong da hoan thanh

- Producer tao lo hang, nhap ngay san xuat, HSD, so luong. Co lua chon `Khong ap dung HSD` (luu JSON `expiryDate: null`).
- Web yeu cau Producer ky thong diep bang MetaMask. Day **la chu ky xac nhan upload metadata**, khong phai giao dich tinh phi.
- Backend xac minh chu ky, mang Sepolia va quyen Producer/Owner tu smart contract. Backend tai metadata JSON len Pinata IPFS; chi backend biet `PINATA_JWT`.
- Sau khi co CID, web gui giao dich `createBatch(batchCode, productName, origin, ipfs://CID)` vao hop dong ProjectCore dang dung. Hop dong luu URI tai checkpoint dau tien, **khong can deploy lai hop dong**.
- Khi khach tra cuu/quet QR, web doc CID tu checkpoint tren Sepolia, tai JSON IPFS qua server, doi chieu ma lo + ten san pham + xuat xu voi du lieu on-chain. Sau do hien NSX/HSD va trang thai: Con han, Sap het han (30 ngay), Het han, Khong ap dung.
- Lo cu thieu CID hop le hoac IPFS khong phan hoi se hien `Chua xac minh`. Web **khong tu suy ra HSD = ngay tao + 180 ngay** nua.

Gioi han: day la **buoc 1** - ghi nhan HSD luc tao lo va canh bao khi tra cuu. Chua co luong cap nhat/thu hoi HSD, tu dong khoa ban lo het han, hoac tu dong gui thong bao. CID la bat bien; neu can sua han su dung phai thiet ke **ban metadata moi + checkpoint dieu chinh + quyen phe duyet** va lich su minh bach.

## 2. Cai dat tren PowerShell Windows

Nen giai nen ban ZIP moi vao thu muc rieng truoc khi thay the ma nguon hien tai.

```powershell
$zipPath = "$env:USERPROFILE\Downloads\HueLegend-IPFS-HSD.zip"
$newFolder = "$env:USERPROFILE\Desktop\HueLegend-IPFS"
Expand-Archive -LiteralPath $zipPath -DestinationPath $newFolder
Set-Location "$newFolder\HueLegend-main"

node --version
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Neu may chan `npm.ps1`, luon dung `npm.cmd` nhu tren.

## 3. Pinata JWT - KHONG dua len frontend

1. Tao tai khoan Pinata, tao API key/JWT co quyen upload **Public IPFS** (endpoint v3 Files).
2. Khong dat khoa vao `src/`, `.env` co prefix `VITE_`, khong commit len GitHub, khong gui khoa tren chat.
3. Chay dev voi bien moi truong chi trong cua so PowerShell hien tai (nhap khoa bi an):

```powershell
Set-Location "$env:USERPROFILE\Desktop\HueLegend-IPFS\HueLegend-main"
$pinataSecret = Read-Host "Nhap PINATA_JWT" -AsSecureString
$pinataPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pinataSecret)
try {
    $env:PINATA_JWT = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pinataPtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pinataPtr)
}
npm.cmd run dev
```

Mo trang theo dia chi do Vite in ra (thuong la `http://localhost:3000`). Ket noi vi Sepolia **da co role Producer**, tai khoan da nap stake neu hop dong yeu cau. Vao `Tao lo hang`, nhap HSD va tao lo. MetaMask hoi ky thong diep upload mot lan, sau do hoi xac nhan giao dich blockchain. Khong phai chia se private key.

De xoa bien moi truong khoi PowerShell sau khi dung:

```powershell
Remove-Item Env:PINATA_JWT
```

## 4. Cau hinh Vercel

- Vercel Project > Settings > Environment Variables: them `PINATA_JWT` voi gia tri JWT, cho Production/Preview theo nhu cau; Redeploy de serverless function nhan bien.
- Tuy chon `SEPOLIA_RPC_URL`: RPC HTTPS Sepolia cua ban co kha nang doc `owner()` va `hasRole()`; mac dinh publicnode.
- Tuy chon `IPFS_GATEWAY_URL`: URL goc gateway `/ipfs`, mac dinh `https://dweb.link/ipfs`.
- Chi khi doi hop dong: dong bo `HUELEGEND_CONTRACT_ADDRESS` tren server voi `CONTRACT_ADDRESS` trong `src/constants.ts`. Khong dat trong client mot secret nao.
- Yeu cau Node.js ho tro `fetch`, `FormData`, `Blob` va `AbortSignal.timeout` (Node 18+).

## 5. Kiem tra bang tay

1. **Lo hop le:** tai khoan Producer tao lo co NSX 2026-11-04, HSD 2027-05-04. Sau khi transaction xac nhan, checkpoint dau tien tren Sepolia chua `ipfs://CID`. Tra cuu lai/quet QR thay dung HSD, link JSON IPFS va nhan `Con han`.
2. **Khong co HSD:** tick `San pham khong ap dung han su dung`, tao lo moi. JSON co `"expiryDate":null`, giao dien hien `Khong ap dung`, khong hien 180 ngay.
3. **Gian lan:** ket noi vi khong duoc cap Producer, goi `POST /api/ipfs-metadata` voi chu ky cua vi do. Server phai tra 403; khong upload file. Thu doi `batchCode`, ten hoac xuat xu trong JSON cua CID khac: tra cuu phai bo qua metadata khong khop.
4. **Ngay khong hop le:** HSD nho hon NSX hoac ngay 2026-02-30 phai bi tu choi truoc khi gui transaction.
5. **Mang hoac Pinata loi:** khi khong co JWT, API tra 503, web khong tao lo on-chain voi URI gia. Khoi phuc bien moi truong va thu lai.

Unit test moi: `test/ipfs-metadata.test.cjs` (8 test). Cac test phan quyen cu: `test/ui-access.test.cjs` (54 test). Lenh `npm.cmd test` chay ca hai.

## 6. Luu y van hanh

- Upload len IPFS xong nhung nguoi dung tu choi giao dich Sepolia: CID co the thanh file khong tham chieu on-chain. Day la truong hop binh thuong, khong nen xoa du lieu de gia lap thanh cong.
- Metadata cong khai tren IPFS; khong dat thong tin ca nhan, so dien thoai, private key hay bi mat kinh doanh vao JSON.
- Han su dung do Producer **khai bao**; Sepolia/IPFS bao ve tinh toan ven va lich su tham chieu, **khong tu chung minh** ngay HSD do la dung ve mat kiem nghiem.
- Backend da kiem tra chu ky, timestamp va role. Khi dua vao san xuat voi nhieu nguoi dung, can them rate limit/anti-replay luu tru dung chung (Redis/DB) va kiem tra quota Pinata. Replay cache hien tai chi trong bo nho cua tung instance.
- Tranh duyet qua source IPFS gateway khi khong co CID; loi gateway se hien `Chua xac minh`, khong suy doan ngay het han.
