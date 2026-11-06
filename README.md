# HueLegend — Nền Tảng Quản Trị & Truy Xuất Nguồn Gốc Đặc Sản Cố Đô Huế (ECO2432)

> **HueLegend (ECO2432):** Nền tảng Web3 DApp minh bạch 100% quy trình sản xuất, thẩm định OCOP, vận chuyển kho lạnh và phân phối thương mại cho các sản phẩm đặc sản Thừa Thiên Huế trên Blockchain Ethereum Sepolia Testnet.

---

## 👥 Thành Viên Thực Hiện Dự Án

1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023`
2. **Ngô Quỳnh Trang** — MSV: `23K4300041`

---

## 🚀 Các Chức Năng Chính Của Ứng Dụng HueLegend:

### 1. Tổng Quan Hệ Thống (System Overview)
- Thống kê thời gian thực các chỉ số On-Chain: Tổng số lô hàng, tỷ lệ đạt chứng nhận OCOP, số lượng đại lý phân phối ghi nhận.
- **Ngày Khởi Tạo Sản Phẩm**: Hiển thị chính xác Ngày Sản Xuất (`productionDate`) do cơ sở khai báo.
- Tìm kiếm tức thì theo mã lô, tên đặc sản, địa danh và bộ lọc trạng thái kiểm định.

### 2. Khai Báo & Khởi Tạo Lô Hàng On-Chain (Producer Management)
- Đăng ký thông tin lô đặc sản Huế (Mè Xửng, Tôm Chua, Trà Sen, Nón Lá, Tinh Dầu Tràm...) lên Smart Contract kèm phí khởi tạo (0.001 ETH).
- Quản lý Quỹ Ký Quỹ Đảm Bảo Chất Lượng (`depositStake` & `withdrawStake`).

### 3. Thẩm Định & Cấp Chứng Nhận OCOP (Inspector Audit)
- Hội đồng thẩm định ký duyệt tiêu chuẩn an toàn thực phẩm, xếp hạng OCOP (3–5 Sao) và cấp chứng nhận số hóa.
- **Theo dõi phí thẩm định**: Hiển thị `SỐ DƯ ETH QUẢN TRỊ VIÊN TRẢ PHÍ THẨM ĐỊNH` chỉ tăng (+0.002 ETH/lô) khi Quản trị viên thực hiện giao dịch chi trả qua MetaMask.

### 4. Vận Chuyển Kho Lạnh & Ghi Nhật Ký Chặng (Logistics Tracking)
- Ghi nhận vị trí, thời gian, nhiệt độ, độ ẩm và thông số bảo quản cho từng chặng giao vận.
- **Theo dõi phí vận chuyển**: Hiển thị `SỐ DƯ ETH QUẢN TRỊ VIÊN TRẢ PHÍ VẬN CHUYỂN` chỉ tăng (+0.002 ETH/chặng) khi Quản trị viên thanh toán thành công.

### 5. Quản Lý Niêm Yết & Bán Lẻ Thương Mại (Retailer & Store)
- Đại lý chọn lô hàng từ đơn vị vận chuyển để niêm yết thương mại.
- **Tự động ẩn lô hàng đã niêm yết**: Lô hàng xác nhận niêm yết thành công sẽ ẩn khỏi danh sách chọn và hiển thị cố định ở bảng "Trạng Thái Niêm Yết Lô Hàng".

### 6. Tra Cứu Hành Trình & Tem QR Stamp (Traceability & Stamp)
- Quét mã QR Code hoặc nhập Mã lô để tra cứu toàn bộ Dòng thời gian (Timeline) minh bạch trên Blockchain.
- Xuất & in Tem QR Stamp niêm phong chính hãng sản phẩm OCOP Cố Đô Huế.

### 7. Quản Trị Hệ Thống & Chi Trả Phí Treasury (Admin & Governance)
- Phân quyền theo mô hình OpenZeppelin AccessControl (`ROLE_PRODUCER`, `ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_INSPECTOR`, `ROLE_ADMIN`).
- **Chi Trả Phí Cho Kiểm Định Viên & Vận Chuyển**: Chuyển đúng số dư ETH (`0.002 ETH/lượt`) trực tiếp về ví thụ hưởng qua giao dịch MetaMask Sepolia.
- **Tắt nút chi trả khi số dư bằng 0**: Ngay sau khi thanh toán xong, nút chi trả tự động tắt/vô hiệu hóa và chỉ bật lại khi có lượt thẩm định OCOP hoặc chặng vận chuyển mới được ký duyệt thành công.
- Cấu hình mức phí tạo lô và chế độ tạm dừng khẩn cấp (`pause/unpause`).

---

## 💻 Hướng Dẫn Chạy Ứng Dụng

```bash
# Cài đặt các thư viện dependencies:
npm install

# Khởi chạy máy chủ phát triển (Dev Server):
npm run dev

# Kiểm tra cú pháp và kiểu dữ liệu (Type check):
npm run lint

# Biên dịch ứng dụng Production:
npm run build
```

---

## 🔗 Thông Tin Smart Contract On-Chain

- **Mạng Lưới:** Ethereum Sepolia Testnet (Chain ID: `11155111`)
- **Địa Chỉ Smart Contract ProjectCore:** `0xfe7BFa3ec478b621ecCA20DD73014Eb79B0bf5C5`