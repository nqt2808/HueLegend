# HueLegend - 4 chuc nang mo rong

## 1. So ton kho theo vai tro

- Co so san xuat: mo `1. Tao Lo Hang`, phan **So ton kho co so san xuat**. San luong ban dau chi duoc tinh khi metadata IPFS cua lo duoc xac minh; du lieu phai co dang `500 Hop` hoac `1.000 Goi`.
- Dai ly: mo `4. Quan Ly Niem Yet`, phan **So ton kho dai ly**. So du bat dau tu 0 va chi tang/giam khi dai ly tu ghi bien dong kho.
- Ban ghi co dinh dang `HL_STOCK_V1:` va duoc luu trong `checkpoint.action` tren Sepolia. Moi ban ghi duoc rang buoc vao `checkpoint.recorder` va `checkpoint.role` do Smart Contract cung cap, vi vay khong lay nham kho cua vi khac.
- He thong tu choi giao dich xuat vuot so du tren giao dien. Tuy nhien, Smart Contract `ProjectCore` hien tai khong co ham inventory rieng, nen quy tac so du **khong duoc enforce truc tiep tren chain**: day la so ghi nhan, khong phai bang chung kiem ke vat ly. Khong nen dung lam bao cao tai chinh chinh thuc.
- Moi lan nhap / xuat kho can xac nhan giao dich MetaMask va mat phi gas Sepolia. **Khong co phi kinh te moi**.

## 2. Ban do hanh trinh van chuyen

- Don vi van chuyen mo `3. Van Chuyen` va nhap toa do GPS thu cong, hoac bam nut xin quyen dinh vi cua trinh duyet.
- GPS duoc luu cung checkpoint theo cu phap `Dia diem [GPS:vi_do,kinh_do]`.
- Mo nhat ky hanh trinh/QR: he thong hien ban do OpenStreetMap cua diem GPS gan nhat, so do cac diem GPS theo thu tu ghi tren chain, va lien ket OpenStreetMap rieng tung diem.
- Duong noi cac diem **khong** duoc hieu la quang duong xe da di. Khong co GPS thi khong tu suy doan.
- Nguoi dung phai dong y truoc khi trinh duyet lay vi tri.

## 3. Dashboard theo vai tro / loai san pham

- Workspace `ADMIN`: thong ke tat ca lo on-chain.
- Workspace `PRODUCER`: chi thong ke lo co `batch.producer` trung vi dang ket noi.
- Workspace `RETAILER`: chi thong ke lo co checkpoint retailer ghi boi vi dang ket noi.
- Ben trong tung dashboard co bo loc `Loai dac san` theo 5 nhom da thong nhat, cong nhom `Chua phan loai` cho lo cu.
- Danh muc lo moi duoc chu san xuat ky, luu vao metadata IPFS va gan CID voi `createBatch` tren Sepolia. Danh muc cua lo cu co the duoc nhan dien tu ban ghi niem yet cu; he thong khong tu doan theo ten san pham.
- Phan thong ke khong tu sinh doanh thu va khong coi niem yet la da ban.

## 4. Phan anh chat luong cong khai

- Tai `Tra Cuu Tem QR`, chon lo -> loai van de -> mo ta -> ket noi vi -> ky thong diep EIP-191.
- API `/api/quality-reports` xac minh chu ky, vi gui, han ky (2 phut), va su ton tai cua lo tren Sepolia truoc khi ghi JSON cong khai vao Pinata/IPFS.
- Danh sach phan anh doc tu Pinata, doi chieu chu ky va CID. Ho tro phan trang.
- Du lieu phan anh tren IPFS **khong ghi giao dich Blockchain**, khong mat gas; khong la ket luan cua kiem dinh vien. Khong nhap email, so dien thoai hoac du lieu ca nhan.
- Ho so phan anh da gui co the khong hien ngay neu Pinata/gateway chua lap chi muc.

## Cau hinh Pinata tren Vercel

Tren Vercel, mo Project -> Settings -> Environment Variables, tao `PINATA_JWT` cho production/preview. Khong dat JWT trong `VITE_` hoac trong ma nguon. Can thiet cho ca metadata NSX/HSD va phan anh chat luong.

Chay thu tren PowerShell:

```powershell
Set-Location "C:\Users\Admin\Desktop\HueLegend-MetaMask\HueLegend-main"
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Neu dung local dev va muon thu upload len IPFS, tao bien moi truong cho phien PowerShell hien tai (khong commit JWT):

```powershell
$env:PINATA_JWT = Read-Host "Nhap PINATA_JWT"
npm.cmd run dev
```

## Tinh huong kiem thu

1. Producer tao lo voi `500 Hop`, sau khi IPFS xac minh: nhap +20, xuat -50 -> so kho 470 Hop. Tai lai trang, so du van duoc tong hop tu checkpoint on-chain.
2. Logistics cap quyen GPS, ghi hai diem toa do hop le; tra QR hien hai diem va ban do. Khong nhap GPS thi khong thay duong di gia.
3. Nguoi mua ky phan anh dung vi cua minh, gui thanh cong -> nhan CID, nguoi khac tra lo co the xem phan anh va doi chieu chu ky.
4. Gian lan: vi retailer thu ghi checkpoint `ROLE_PRODUCER` hoac thay doi chu ky phan anh -> khong duoc chap nhan. Test `supply-features.test.cjs` kiem tra du lieu am/gia GPS/nguoi gui gia mao, con hop dong Sepolia kiem tra role giao dich.

### Gioi han chua xoa bo

- Chua co smart contract inventory co khoi luong hang va chuyen giao hai ben. Sổ kho phu thuoc su trung thuc cua vi ghi va khong ngan duoc mot actor khai nhap kho qua nhieu.
- Ban do khong theo doi thoi gian thuc, chi hien cac checkpoint GPS da duoc ghi.
- Can PINATA_JWT, Sepolia RPC va ket noi Internet de su dung luong ghi IPFS.
- Khong co luong tai khoa hay xu ly don hang/hoan tien cho phan anh; khi can can thong nhat quy tac va bo sung smart contract/API phu hop.
