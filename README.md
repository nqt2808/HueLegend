# HueLegend — Hệ Thống Quản Trị & Truy Xuất Nguồn Gốc Đặc Sản Huế (React + Vite + TypeScript)

> **HueLegend (ECO2432):** Nền tảng Web3 DApp minh bạch 100% lịch sử nguồn gốc và quy trình OCOP cho các sản phẩm đặc sản Cố Đô Huế trên Blockchain Sepolia.

---

## 🚀 Tính năng nổi bật của ứng dụng React:

1. **Tổng quan hệ thống (Dashboard Overview):**
   - Thống kê chỉ số On-Chain: Tổng số lô hàng đặc sản, tỷ lệ đạt chứng nhận OCOP, tổng số dư tiền ký quỹ Producer, tổng số chặng đã ghi nhận.
   - Danh sách tương tác 6 đặc sản Huế tiêu biểu: Mè Xửng Thiên Hương, Tôm Chua Trọng Tín, Trà Sen Cung Đình, Nón Lá Bài Thơ, Tinh Dầu Tràm Hoa Nén, Kẹo Gương Phò Trạch.
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
   - Phân quyền theo vai trò OpenZeppelin AccessControl (`ROLE_PRODUCER`, `ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_INSPECTOR`).
   - Điều chỉnh mức phí khai báo lô hàng.

---

## 💻 Hướng dẫn chạy ứng dụng

```bash
# Cài đặt thư viện dependencies:
npm install

# Khởi chạy máy chủ phát triển (Dev Server):
npm run dev

# Biên dịch ứng dụng production:
npm run build
```

---

## 🔗 Thông tin Smart Contract:

- **Mạng:** Ethereum Sepolia Testnet (Chain ID: `11155111`)
- **Địa chỉ Smart Contract ProjectCore:** `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b`
- **Tài khoản Admin / Deployer:** `0x82d022a704706B2f144863D619D7418F8a0f19A7`
