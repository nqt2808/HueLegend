# LAB 09 — HỢP ĐỒNG ĐẦU TIÊN: KÉT TIẾT KIỆM CÓ KHÓA THỜI GIAN

- **Học kỹ thuật tại:** [`contracts/training/TimeLockVault.sol`](./contracts/training/TimeLockVault.sol)
- **Áp dụng vào sản phẩm:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-09: contract loi bien dich duoc
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 9

- [x] **Bước 1 — Viết SPEC.md:**
  - Bổ sung Mục 5 trong [`docs/SPEC.md`](./docs/SPEC.md) với đầy đủ 5 quy tắc chuẩn của TimeLockVault (R-TL1 đến R-TL5).
  - Khoanh vùng luồng ký quỹ cam kết uy tín làng nghề (Reputation Staking with TimeLock) cho cơ sở sản xuất.
- [x] **Bước 2 & 3 — AI sinh mã & Đối chiếu với bản mẫu:**
  - Hoàn thiện [`contracts/training/TimeLockVault.sol`](./contracts/training/TimeLockVault.sol).
  - Ghi nhận 4 điểm cốt lõi cần hiểu vào [`docs/AI_JOURNAL.md`](./docs/AI_JOURNAL.md) (Checks-Effects-Interactions, Custom Errors, call thay cho transfer, indexed trong event).
- [x] **Bước 4 — Biên dịch, triển khai, đo phí:**
  - Lập bảng đo lượng Gas 3 thao tác (`deposit`, `withdraw` thất bại StillLocked, `withdraw` thành công) tại [`evidence/lab-09/README.md`](./evidence/lab-09/README.md).
- [x] **Bước 5 — Chuyển kỹ thuật vào sản phẩm nhóm:**
  - Nâng cấp hợp đồng [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol) tích hợp cơ chế nộp cọc `depositStake()` và rút cọc `withdrawStake()` tuân thủ nghiêm ngặt CEI và phân quyền vai trò.
  - Viết bộ kiểm thử [`test/TimeLockVault.test.js`](./test/TimeLockVault.test.js).
  - Biên dịch sạch 100% không cảnh báo.

---

## Lệnh Git nộp bài:
```bash
git add .
git commit -m "lab-09: contract loi bien dich duoc"
git push origin main
```
