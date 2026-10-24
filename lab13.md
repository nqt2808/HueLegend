# LAB 13 — THỰC NGHIỆM MỘT VỤ MẤT TIỀN VÀ CÁCH KHẮC PHỤC

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Dự án:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm:**
  1. **Ngô Quỳnh Trang** — MSV: `23K4300041` (Lead Lab 13: Hợp đồng & Kiểm thử)
  2. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023` (Đặc tả & Giao diện)
- **Bài luyện tập:** [`contracts/training/VulnerableBank.sol`](./contracts/training/VulnerableBank.sol) & [`contracts/training/SafeBank.sol`](./contracts/training/SafeBank.sol)
- **Hợp đồng sản phẩm:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)
- **Hồ sơ bằng chứng:** [`evidence/lab-13/README.md`](./evidence/lab-13/README.md)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-13: them negative test va hardening
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 13

- [x] **Bước 1 — Dựng hiện trường trên Remix VM (20 phút):**
  - Triển khai `VulnerableBank`, 3 tài khoản nạp mỗi người 2 ETH.
  - Xác nhận `bankBalance() = 6.0 ETH`.
- [x] **Bước 2 — Tấn công rút cạn hợp đồng (15 phút):**
  - Triển khai `Attacker`, nạp 1 ETH làm mồi và gọi `attack()`.
  - Hợp đồng `Attacker` kích hoạt chuỗi đệ quy tái nhập qua hàm `receive()`, rút cạn toàn bộ 6 ETH của ngân hàng + 1 ETH vốn ban đầu.
  - Xác nhận `bankBalance() = 0.0 ETH`, kẻ tấn công chiếm đoạt 7.0 ETH.
  - Xác định nguyên nhân gốc: **Chuyển tiền ra ngoài (`.call`) trước khi cập nhật sổ sách (`balances[msg.sender] = 0`)**.
- [x] **Bước 3 — Hỏi công cụ AI theo lối dẫn dắt (15 phút):**
  - Thực hiện đúng prompt dẫn dắt: *"Bạn là kiểm toán viên hợp đồng thông minh. Đừng đưa mã sửa ngay..."*.
  - Phân tích chi tiết 5 bước của cơ chế tái nhập và so sánh ưu nhược điểm giữa CEI và OpenZeppelin ReentrancyGuard.
- [x] **Bước 4 — Vá lỗi bằng hai cách & Chứng minh tấn công thất bại (25 phút):**
  - Tạo hợp đồng [`contracts/training/SafeBank.sol`](./contracts/training/SafeBank.sol) triển khai:
    - **Cách 1 (`SafeBankCEI`):** Đổi thứ tự Checks — Effects — Interactions (cập nhật sổ sách trước khi chuyển tiền).
    - **Cách 2 (`SafeBankGuard`):** Sử dụng `ReentrancyGuard` của OpenZeppelin 5.x (`nonReentrant`).
  - Chạy lại cuộc tấn công $\rightarrow$ **Cả hai bản vá đều chặn đứng cuộc tấn công, giao dịch bị REVERT thành công**.
  - **Ba câu giải thích cốt lõi:**
    1. Khi lệnh cập nhật số dư được đưa lên trước lệnh chuyển tiền, trạng thái nội bộ của người rút đã ghi nhận bằng 0 ngay lập tức.
    2. Khi kẻ tấn công đệ quy gọi lại `withdraw()`, bước kiểm tra điều kiện (Checks) sẽ phát hiện số dư bằng 0 và hoàn tác giao dịch.
    3. Do đó, chính **thứ tự các dòng lệnh** (Effects before Interactions) là thứ triệt tiêu điều kiện đệ quy, chứ không phụ thuộc vào bất kỳ từ khóa nào.
- [x] **Bước 5 — Soi lại hợp đồng `ProjectCore.sol` & Hardening (10 phút):**
  - Rà soát các điểm chuyển tiền trong `withdrawStake()` và `createBatch()`.
  - Thực hiện **Hardening**: Kế thừa `ReentrancyGuard` và bổ sung `nonReentrant` modifier tạo tầng phòng thủ kép kết hợp cùng CEI.
  - Viết và chạy bộ kiểm thử thất bại tự động [`test/negative_tests.py`](./test/negative_tests.py) đạt chuẩn 5/5 nhóm kiểm thử (Sai thời điểm, Sai người, Sai số tiền, Gọi lại tái nhập, Spam DoS).
  - Cập nhật nhật ký kỹ thuật vào [`docs/AI_JOURNAL.md`](./docs/AI_JOURNAL.md).

---

## Lệnh Git nộp bài:
```bash
git add .
git commit -m "lab-13: them negative test va hardening"
git push origin main
```
