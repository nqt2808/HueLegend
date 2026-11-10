# LAB 12 — GATE REVIEW 1: DUYỆT CODEBASE VÀ PHẠM VI

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Dự án:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm:**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023` (Trưởng nhóm)
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Hợp đồng sản phẩm:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)
- **Tài liệu quyết định:** [`docs/GATE_REVIEW_1.md`](./docs/GATE_REVIEW_1.md)
- **Kế hoạch dự án:** [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md)
- **Hồ sơ bằng chứng:** [`evidence/lab-12/README.md`](./evidence/lab-12/README.md)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-12: gate review 1 va cap nhat pham vi
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 12

- [x] **Bước 1 — Tự kiểm tra sức khỏe repo (15 phút):**
  - Xây dựng và thực thi kịch bản kiểm tra tự động [`test/repo_health_check.js`](./test/repo_health_check.js).
  - Đạt chuẩn tuyệt đối **5/5 tiêu chí sức khỏe** (100% Healthy):
    1. `README.md` trình bày rõ bài toán làm giả đặc sản Huế, 4 đối tượng người dùng và hướng dẫn chạy 3 cách.
    2. `PROJECT_PLAN.md`, `SPEC.md`, `ECONOMIC_RULES.md` đồng bộ 100% với hợp đồng `ProjectCore.sol`.
    3. `ProjectCore.sol` biên dịch sạch (0 lỗi / 0 cảnh báo) với `solc v0.8.37`.
    4. Kiểm thử đạt cả ca hợp lệ (`TC-01`) và 3 ca vi phạm bị chặn (`TC-01b` nộp thiếu phí, `TC-01c` vượt trần an toàn, `TC-03` mạo danh vai trò).
    5. Lịch sử Git ghi nhận đóng góp liên tục của tất cả thành viên trong nhóm.
  - Xuất toàn văn nhật ký vào [`evidence/lab-12/repo_health_check_log.txt`](./evidence/lab-12/repo_health_check_log.txt).

- [x] **Bước 2 — Demo 3 phút/nhóm (45 phút):**
  - Thực hiện trọn vẹn kịch bản demo 3 phút chia đều từng giây:
    - **30 giây:** Nêu rõ bài toán làng nghề đặc sản Huế bị xâm hại thương hiệu và giải pháp mã QR blockchain.
    - **30 giây:** Trình bày 3 điểm kinh tế cốt lõi (Phí tạo lô 0.001 ETH, Cọc 0.05 ETH khóa 30 ngày, Trần Circuit Breaker 0.01 ETH).
    - **60 giây:** Mở `ProjectCore.sol`, thực thi tạo lô `HL-MEXUNG-2026-001`, nộp phí 0.001 ETH chuyển về ví Quỹ, phát event và sinh QR động.
    - **30 giây:** Thực thi ca vi phạm nộp thiếu phí (chặn bởi `InsufficientBatchFee`) và ca mạo danh vai trò (chặn bởi `UnauthorizedCaller`).
    - **30 giây:** Trình bày định hướng phát triển Lab 13 (Test tấn công), Lab 14 (Audit chéo) và Lab 15 (DApp công khai).

- [x] **Bước 3 — Nhận quyết định và thu hẹp (10 phút):**
  - Ghi nhận quyết định chính thức: **QUA CÓ ĐIỀU KIỆN (CONDITIONAL PASS) & ĐỒNG THUẬN THU HẸP PHẠM VI** vào tệp [`docs/GATE_REVIEW_1.md`](./docs/GATE_REVIEW_1.md).
  - Xác lập **Ba việc bắt buộc sửa**:
    1. Giữ luồng kiểm định OCOP trực tiếp on-chain bởi `ROLE_INSPECTOR`, hoãn tích hợp oracle ngoài chuỗi.
    2. Bổ sung bộ test ca gian lận phức tạp (`StillLocked`, `BatchAlreadyExists`, DoS spam) cho Lab 13.
    3. Tối ưu hóa giao diện camera quét mã QR trên thiết bị di động kết nối mạng Sepolia.
  - Quyết định **Cắt giảm 3 tính năng**:
    1. Cắt bỏ Utility Token riêng ERC-20, chỉ dùng Native ETH để tối ưu trải nghiệm.
    2. Cắt bỏ cụm máy chủ IPFS riêng, dùng mã băm SHA-256 và gateway công khai trong `metadataURI`.
    3. Cắt bỏ Quản trị Đa chữ ký (Multi-Sig 2/3) ngoài chuỗi, giữ vững RBAC và Circuit Breaker on-chain.
  - Hạn hoàn thành: Trước buổi **Lab 13 (Tuần 5)**.

- [x] **Bước 4 — Cập nhật kế hoạch (5 phút):**
  - Cập nhật [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) phiên bản v0.4 theo quyết định thu hẹp.
  - Phân công xoay vai chính thức cho giai đoạn Lab 12–15:
    - **Ngô Quỳnh Trang** (23K4300041): Vai chính **Hợp đồng & Kiểm thử** (Lead Lab 13 & Lab 14).
    - **Ngô Thị Thuỷ Vân** (23K4300023): Vai chính **Đặc tả & Giao diện** (Lead Lab 15).

---

## Lệnh Git nộp bài:
```bash
git add .
git commit -m "lab-12: gate review 1 va cap nhat pham vi"
git push origin main
```
