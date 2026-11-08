# HueLegend - Quan tri va truy xuat nguon goc dac san Hue (08/11/2026)

**Trang thai hien tai:** frontend React/Vite va folder `web/` duoc build tu cung mot ma nguon; phan quyen hien thi dua tren `owner()`, `hasRole()` va `isAdmin()` cua Sepolia. Mot vi duoc cap nhieu role co toan bo chuc nang tuong ung, khong phai ket noi lai tung role. Owner va Admin duoc xac minh tren hop dong **moi** co quyen quan tri va toan bo role nghiep vu.

**Luu y hop dong dang chay:** `src/constants.ts` hien van tro den Sepolia `0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C`. Bytecode cu dung `onlyOwner` cho quan tri; cap `ROLE_ADMIN` o do khong bien vi thu hai thanh Admin day du. Thay doi Solidity trong repo khong nang cap hop dong da deploy. Xem [docs/MULTI_ADMIN_DEPLOY.md](docs/MULTI_ADMIN_DEPLOY.md) truoc khi tao hop dong moi va lap ke hoach giu du lieu/ky quy cu.

**Doi chieu file ZIP `HueLegend-Huelegend-van` ngay 02/11/2026:** [docs/ARCHIVE_REVIEW_2026-11-08.md](docs/ARCHIVE_REVIEW_2026-11-08.md). Cac dich vu Supabase cu, du lieu mo phong va luong checkout tao giao dich gia **khong** duoc nhap lai.

**Danh muc 15 dac san Hue:** `public/huelegend-15.csv` duoc doc trong trang Cua hang va dong bo sang `web/huelegend-15.csv` bang `npm run build:web`. Day la 15 ban ghi tham khao (ten, don vi, nguon goc, so luong demo), **chua phai 15 lo hang da duoc ghi hay niem yet tren Sepolia**. Khong gan OCOP, gia ban, QR hay cho thanh toan cho ban ghi tham khao. Muon bien chung thanh lo that, Producer can xac minh NSX/HSD va ghi giao dich MetaMask, sau do Retailer niem yet on-chain.

**Cap nhat ket noi MetaMask (04/11/2026):** moi lan bam Ket noi > Chon vai tro, ung dung yeu cau chon/xac nhan tai khoan trong MetaMask bang `wallet_requestPermissions` truoc khi xac minh role tren Sepolia; khong tu nhan lai vi da dang nhap truoc. Xem [docs/METAMASK_ROLE_PICKER.md](docs/METAMASK_ROLE_PICKER.md).

**Cap nhat HSD Blockchain + IPFS (04/11/2026):** da bo sung metadata JSON Pinata/IPFS, chu ky Producer, doi chieu CID Sepolia va hien trang thai HSD khi tra cuu. Can cau hinh `PINATA_JWT` tren server de upload. Xem [docs/IPFS_HSD.md](docs/IPFS_HSD.md) de cai dat bang PowerShell, chay test va biet nhung gioi han cua ban buoc 1.

**Huong dan tieng Viet, ma tran vai tro va gioi han kiem thu:** [docs/ROLE_NAVIGATION.md](docs/ROLE_NAVIGATION.md).

Ban nay duoc sua tu file HueLegend-main.zip do nguoi dung gui. Giu React/Vite/TypeScript va giao dien xanh-vang hien tai.
Khach chua ket noi co the xem Tong quan, Tra cuu QR va Cua hang. Vai tro duoc xac minh bang owner()/hasRole() tren Sepolia; khong gan vi mac dinh va khong lay quyen tu localStorage.
Cac ghi chu lich su ben duoi khong phai xac nhan nghiem thu blockchain cua ban nay.

---

# HueLegend — Hệ Thống Quản Trị & Truy Xuất Nguồn Gốc Đặc Sản Huế (React + Vite + TypeScript)

> **HueLegend (ECO2432):** Nền tảng Web3 DApp minh bạch 100% lịch sử nguồn gốc và quy trình OCOP cho các sản phẩm đặc sản Cố Đô Huế trên Blockchain Sepolia.

---

## 🚀 Tính năng nổi bật của ứng dụng React:

1. **Tổng quan hệ thống (Dashboard Overview):**
   - Thống kê chỉ số On-Chain: Tổng số lô hàng đặc sản, tỷ lệ đạt chứng nhận OCOP, tổng số dư tiền ký quỹ Producer, tổng số chặng đã ghi nhận.
   - Chỉ hiển thị lô hàng và lịch sử thực sự đọc được từ hợp đồng Sepolia; không sinh sản phẩm mẫu để giả lập dữ liệu giao dịch.
   - Bộ lọc trạng thái OCOP & công cụ tìm kiếm tức thì.

2. **Tra cứu & Xác thực Tem QR Blockchain (Traceability & QR Stamp):**
   - Tra cứu chi tiết hành trình từng lô hàng bằng Mã Định Danh (e.g., `HL-MEXUNG-2026-001`).
   - Tích hợp máy quét Camera QR Code để quét trực tiếp mã niêm phong.
   - Trực quan hóa Dòng Thời Gian (Timeline) tất cả các chặng: Sản xuất, Vận chuyển kho lạnh, Nhập kho đại lý.
   - Xem chứng nhận OCOP, ghi chú của Kiểm Định Viên và liên kết giao dịch Etherscan Sepolia.
   - Xuất và in Tem Mã QR Niêm Phong chính hãng.

3. **Khai báo & Quản lý Lô Hàng (Producer Management):**
   - Khởi tạo lô hàng đặc sản mới on-chain (`createBatch`) kèm đóng nộp phí khai báo (0.001 ETH).
   - Quản lý Tiền Ký Quỹ Đảm Bảo (`depositStake` & `withdrawStake`) với mức cọc tối thiểu 0.05 ETH.

4. **Ghi Nhật Ký Chặng Supply Chain (Logistics & Retailer Checkpoint):**
   - Ghi nhận vị trí, thời gian, mô tả chi tiết công đoạn và điều kiện bảo quản (nhiệt độ, độ ẩm) cho từng chặng.

5. **Thẩm Định & Cấp Chứng Nhận OCOP (Inspector Audit):**
   - Kiểm định chất lượng vi sinh, nguồn gốc xuất xứ và cấp chứng nhận OCOP 4-5 sao hoặc thu hồi chứng nhận nếu vi phạm.

6. **Quản Trị RBAC & Cấu Hình Phí (Admin & Governance):**
   - Phân quyền `ROLE_ADMIN`, `ROLE_PRODUCER`, `ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_INSPECTOR` bằng mapping RBAC trong `ProjectCore.sol`, kế thừa `Ownable` của OpenZeppelin.
   - Điều chỉnh mức phí khai báo lô hàng.
   - Quyền đã cấp được đọc lại từ Sepolia khi kết nối, đồng bộ và trước mỗi giao dịch. Khi ví có nhiều vai trò, các menu và quyền tương ứng được gộp lại.

---

## 💻 Hướng dẫn chạy ứng dụng

```bash
# Cài đặt thư viện dependencies:
npm install

# Khởi chạy máy chủ phát triển (Dev Server):
npm run dev

# Biên dịch ứng dụng production:
npm run build

# Dong bo ban build vao web/ de phat hanh static:
npm run build:web

# Chay bo kiem thu phan quyen, IPFS, giao dien va tuong thich:
npm test
```

---

## 🔗 Thông tin Smart Contract:

- **Mạng:** Ethereum Sepolia Testnet (Chain ID: `11155111`)
- **Địa chỉ smart contract đang được frontend sử dụng:** `0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C` (hợp đồng cũ, chưa hỗ trợ Admin thứ hai đầy đủ).
- **ABI biên dịch từ mã nguồn mới:** `public/ProjectCore_abi.json` và `web/ProjectCore_abi.json`, cùng được tạo bởi `npm run compile:contract` / `npm run build:web`. ABI này dành cho **hợp đồng mới**, không được tự suy ra là bytecode đang chạy tại địa chỉ cũ.
- **Đường dẫn tương thích:** `web/admin.html` chuyển về ứng dụng chính, không tự cấp quyền Admin.
# Chuc nang mo rong (2026-11-04)

Huong dan so kho on-chain, ban do GPS van chuyen, dashboard theo workspace/loai dac san va phan anh chat luong ky vi qua IPFS: [docs/SUPPLY_FEATURES.md](docs/SUPPLY_FEATURES.md).

