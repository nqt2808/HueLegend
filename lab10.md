# LAB 10 — RÀ SOÁT MÃ NGUỒN DO AI SINH RA (BÀI QUAN TRỌNG NHẤT)

- **Bài luyện:** [`contracts/training/VaultBuggy.sol`](./contracts/training/VaultBuggy.sol)
- **Mục tiêu thật:** Tìm và sửa lỗi trong [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-10: audit va sua loi project core
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 10

- [x] **Bước 1 & 2 — Rà soát thủ công & Chạy rà soát bằng AI:**
  - Phát hiện đầy đủ 4 lỗi cài sẵn trong `VaultBuggy.sol` (Lộ biến private qua slot 2, thiếu kiểm soát quyền trong `withdraw()`, logic ngược thời gian, dùng `transfer` lỗi thời).
- [x] **Bước 3 — Chứng minh một phát hiện bằng thực nghiệm:**
  - Viết kịch bản kiểm thử [`test/VaultBuggy.test.js`](./test/VaultBuggy.test.js) đọc trực tiếp ô nhớ Slot 2 bằng `eth_getStorageAt` và giải mã thành công giá trị `emergencyPin = 123456`.
  - Khẳng định kết luận: Từ khóa `private` không bảo mật dữ liệu trước các truy vấn đọc ngoài chuỗi.
- [x] **Bước 4 — Audit contract của chính nhóm:**
  - Rà soát `ProjectCore.sol` đối chiếu với `SPEC.md`.
  - Lập bảng 4 lỗi bắt buộc trong [`docs/AI_JOURNAL.md`](./docs/AI_JOURNAL.md) phân biệt rõ lỗi do AI tìm ra và lỗi do **Sinh viên tự tìm ra**.
  - Đã sửa triệt để cả 4 lỗi trong hợp đồng `ProjectCore.sol` và bổ sung test case tại [`test/ProjectCore.test.js`](./test/ProjectCore.test.js).
- [x] **Biên dịch & Lưu hồ sơ:**
  - Lưu toàn bộ báo cáo và bằng chứng vào [`evidence/lab-10/README.md`](./evidence/lab-10/README.md).

---

## Lệnh Git nộp bài:
```bash
git add .
git commit -m "lab-10: audit va sua loi project core"
git push origin main
```
