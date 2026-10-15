# LAB 11 — CÀI QUY TẮC KINH TẾ VÀO SẢN PHẨM

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Dự án:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm:**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023` (Trưởng nhóm)
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Bài mẫu luyện tập:** [`contracts/training/ClassPoint.sol`](./contracts/training/ClassPoint.sol)
- **Hợp đồng sản phẩm:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)
- **Tài liệu quy tắc:** [`docs/ECONOMIC_RULES.md`](./docs/ECONOMIC_RULES.md) & [`docs/SPEC.md`](./docs/SPEC.md)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-11: cai quy tac kinh te va test
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 11

- [x] **Bước 1 — Đọc ví dụ chuẩn có sẵn:**
  - Kế thừa thư viện OpenZeppelin Contracts 5.x đã được kiểm toán an toàn thay vì tự viết từ đầu.
- [x] **Bước 2 — Bản mẫu có 2 quy tắc kinh tế (`ClassPoint.sol`):**
  - Hiểu và cài đặt cơ chế **Điểm cơ bản (basis point)**: `feeBps = 100` (1%) trên mẫu số `10,000`.
  - Hiểu điều kiện **loại trừ chủ sở hữu** (`from != owner()`): Không trừ phí khi airdrop / phân phối token cho sinh viên.
  - Nắm vững cú pháp OpenZeppelin 5.x: Sử dụng **`_update`** thay thế cho `_beforeTokenTransfer` đã bị loại bỏ; kiểm chứng lỗi biên dịch khi dùng sai hook cũ.
  - Cài đặt trần sở hữu ví 2% tổng cung (`maxHolding`).
- [x] **Bước 3 — Chọn và cài một quy tắc của nhóm:**
  - Chọn quy tắc **Phí khởi tạo lô hàng đặc sản (`batchCreationFee = 0.001 ETH`)** từ `ECONOMIC_RULES.md` chuyển vào `ProjectCore.sol`.
  - Tiền phí được tự động nộp vào ví Quỹ bảo tồn phát triển đặc sản OCOP Huế (`ecosystemFund`) bằng lệnh `call{value: msg.value}("")` tuân thủ CEI.
  - Thêm trần an toàn Circuit Breaker `MAX_BATCH_FEE_LIMIT = 0.01 ETH` bảo vệ quyền lợi các hộ sản xuất nhỏ lẻ.
  - Thêm sự kiện `BatchFeeCollected`, `BatchCreationFeeUpdated` và custom errors `InsufficientBatchFee`, `FeeExceedsLimit`.
- [x] **Bước 4 — Kiểm thử và chốt phiên bản:**
  - Thực thi ca hợp lệ (TC-01): Tạo lô thành công, nộp đúng 0.001 ETH, số dư ví quỹ tăng chính xác 0.001 ETH, phát sự kiện biên lai.
  - Thực thi ca vi phạm kinh tế (TC-01b): Nộp thiếu 0.0005 ETH bị từ chối bằng đúng lỗi `InsufficientBatchFee`.
  - Thực thi ca vi phạm trần an toàn (TC-01c): Set phí vượt 0.01 ETH bị từ chối với lỗi `FeeExceedsLimit`.
  - Thực thi ca vi phạm gian lận (TC-03): Mạo danh tạo lô bị chặn với lỗi `UnauthorizedCaller`.
  - Lưu đầy đủ nhật ký kiểm thử (`test_execution_log.txt`) và hình ảnh trực quan (`lab11_economic_flow.png`) vào [`evidence/lab-11/`](./evidence/lab-11/).
  - Cập nhật đồng bộ [`docs/SPEC.md`](./docs/SPEC.md) lên phiên bản `v0.3` và [`docs/AI_JOURNAL.md`](./docs/AI_JOURNAL.md).

---

## Lệnh Git nộp bài:
```bash
git add .
git commit -m "lab-11: cai quy tac kinh te va test"
git push origin main
```
