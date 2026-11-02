# PROJECT PLAN — HueLegend (Phiên bản v0.4 — Sau Gate Review 1)

## 1. Thành viên và Phân công xoay vai (Lab 12–15)

Nhóm gồm 2 thành viên kiêm nhiệm 4 vai trò chính: **Đặc tả**, **Hợp đồng**, **Giao diện**, **Kiểm thử**. Thực hiện đúng quy định luân chuyển (xoay) vai trò từ Lab 12 theo quyết định tại [`GATE_REVIEW_1.md`](./GATE_REVIEW_1.md):

| Họ tên | Mã sinh viên | Vai chính Lab 8–11 | Vai chính Lab 12–15 | Phụ trách cụ thể giai đoạn Lab 12–15 |
| :--- | :--- | :--- | :--- | :--- |
| **Ngô Quỳnh Trang** | `23K4300041` | Đặc tả & Giao diện | **Hợp đồng & Kiểm thử** | - Chịu trách nhiệm chính **Lab 13**: Viết bộ test tấn công và gian lận tinh vi (`StillLocked`, `UnauthorizedCaller`, `InsufficientBatchFee`).<br>- Chịu trách nhiệm chính **Lab 14**: Audit chéo hợp đồng của nhóm bạn.<br>- Kiểm thử tích hợp E2E hệ thống cuối kỳ. |
| **Ngô Thị Thuỷ Vân** | `23K4300023` (Trưởng nhóm) | Hợp đồng & Kiểm thử | **Đặc tả & Giao diện** | - Chịu trách nhiệm cập nhật **SPEC.md v0.4** và **ECONOMIC_RULES.md** sau thu hẹp phạm vi.<br>- Phát triển giao diện Web3 DApp (`web/index.html`) hỗ trợ quét mã QR bằng camera di động.<br>- Chịu trách nhiệm chính **Lab 15**: Xây dựng slide, kịch bản live demo và bảo vệ dự án. |

---

## 2. Người dùng và Vấn đề giải quyết

- **Người dùng chính:**
  - *Cơ sở sản xuất & Làng nghề truyền thống Huế:* Các hộ kinh doanh, xưởng đặc sản (Mè xửng Thiên Hương, Tôm chua Trọng Tín, Trà Cung đình Đức Phượng, Nón lá Tây Hồ, Dầu tràm Lộc Thủy).
  - *Đơn vị chuỗi cung ứng:* Đơn vị logistics đường bộ, đường sắt (Ga Huế), đường hàng không (Sân bay Phú Bài), đại lý/điểm bán lẻ quà lưu niệm tại Huế.
  - *Khách mua hàng & Du khách:* Người tiêu dùng mua đặc sản Huế làm quà, cần kiểm chứng nguồn gốc chuẩn chỉ on-chain qua mã QR.
  - *Cơ quan thẩm định:* Chi cục Quản lý Chất lượng Nông Lâm Thủy sản, Ban quản lý OCOP tỉnh Thừa Thiên Huế.

- **Vấn đề cần giải quyết:**
  - Tình trạng hàng nhái, hàng trôi nổi kém chất lượng mạo danh đặc sản Huế làm suy giảm nghiêm trọng uy tín làng nghề.
  - Khách hàng thiếu công cụ tin cậy để đối soát thông tin; tem nhãn giấy truyền thống rất dễ bị làm giả, bóc dán tráo đổi.
  - Các bên vận chuyển, phân phối thiếu bằng chứng xác nhận trách nhiệm minh bạch, bất biến.

---

## 3. Phạm vi sản phẩm sau Gate Review 1 (Scope after Gate Review 1)

Theo nguyên tắc của Gate Review 1: **"Giữ một luồng cốt lõi chạy chắc, không cố giữ nhiều tính năng nửa vời"**, phạm vi sản phẩm được chốt như sau:

### 3.1. Luồng cốt lõi ĐƯỢC GIỮ VỮNG (Core Scope):
1. **Khởi tạo lô đặc sản on-chain (`createBatch`):**
   - Chỉ ví có `ROLE_PRODUCER` đã nộp đủ tiền cọc uy tín `MIN_STAKE_AMOUNT = 0.05 ETH` mới được tạo lô.
   - Bắt buộc nộp phí khởi tạo lô hàng `batchCreationFee = 0.001 ETH` nộp vào Quỹ phát triển OCOP Huế (`ecosystemFund`) theo chuẩn CEI.
   - Có cơ chế trần an toàn Circuit Breaker `MAX_BATCH_FEE_LIMIT = 0.01 ETH`.
2. **Ký quỹ bảo đảm uy tín có khóa thời gian (`depositStake`, `withdrawStake`):**
   - Tiền cọc bị khóa an toàn tối thiểu `30 days` trước khi được phép rút.
3. **Ghi nhận chặng chuỗi cung ứng theo đúng vai trò (`addCheckpoint`):**
   - Hỗ trợ các vai trò `ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_PRODUCER`, giới hạn tối đa 50 chặng/lô chống DoS.
4. **Kiểm định và thu hồi chứng nhận OCOP (`verifyBatch`, `revokeBatchVerification`):**
   - Cấp tem và thu hồi tem OCOP trực tiếp on-chain bởi cơ quan kiểm định `ROLE_INSPECTOR`.
5. **Giao diện Web3 DApp công khai (`web/index.html`):**
   - Hỗ trợ sinh mã QR động cho từng lô hàng và tra cứu dòng thời gian (Timeline) bất biến miễn phí gas.

### 3.2. Tính năng ĐÃ CẮT BỎ (Cut Features):
- ❌ **Cắt bỏ phát hành Token tiện ích riêng (Utility ERC-20 BPS):** Sử dụng Native ETH trực tiếp cho toàn bộ phí và cọc để tối ưu trải nghiệm và luồng xử lý.
- ❌ **Cắt bỏ tự dựng cụm máy chủ IPFS Node riêng:** Lưu mã băm chứng từ và liên kết số hóa trực tiếp vào trường `metadataURI`.
- ❌ **Cắt bỏ Quản trị Đa chữ ký (Multi-Sig 2/3) phức tạp ngoài chuỗi:** Duy trì hệ thống phân quyền RBAC và Circuit Breaker on-chain đã kiểm thử sạch.

---

## 4. Các mốc tiến độ bắt buộc

- **Lab 9 (Đã đạt):** Contract lõi biên dịch được (`solc ^0.8.20`, OpenZeppelin 5.x, CEI pattern).
- **Lab 10 (Đã đạt):** Audit và sửa lỗi có bằng chứng (phát hiện và sửa 4 lỗi, đọc ô nhớ private slot 2).
- **Lab 11 (Đã đạt):** Quy tắc kinh tế chạy đúng (phí tạo lô 0.001 ETH, trần Circuit Breaker 0.01 ETH, test 7/7 ca pass).
- **Lab 12 (Hoàn thành):** **Gate Review 1** (Tự kiểm tra sức khỏe repo đạt 5/5 tiêu chí, demo 3 phút, duyệt codebase và thu hẹp phạm vi).
- **Lab 13 (Mốc tiếp theo — Ngô Quỳnh Trang Lead):** Xây dựng bộ test tấn công và gian lận tinh vi (TC-04: Rút cọc trước hạn `StillLocked`, TC-05: Spam chặng quá tải DoS, TC-06: Mạo danh thanh tra OCOP).
- **Lab 14 (Ngô Quỳnh Trang & Ngô Thị Thuỷ Vân):** Audit chéo mã nguồn hợp đồng giữa các nhóm trong lớp; hoàn thiện tài liệu phản biện.
- **Lab 15 (Ngô Thị Thuỷ Vân Lead):** Công khai URL DApp Web3, live demo quét mã QR bằng camera di động và bảo vệ dự án cuối kỳ.
