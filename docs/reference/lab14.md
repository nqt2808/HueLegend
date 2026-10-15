# LAB 14 — RÀ SOÁT CHÉO GIỮA CÁC NHÓM (CROSS-TEAM SMART CONTRACT AUDIT)

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
- **Dự án:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain  
- **Thành viên nhóm:**  
  1. **Ngô Quỳnh Trang** — MSV: `23K4300041` (Lead Lab 14: Rà soát hợp đồng & Khắc phục lỗi)  
  2. **Ngô Thị Thuý Vân** — MSV: `23K4300023` (Đặc tả kỹ thuật & Báo cáo)  
- **Đối tượng audit nhóm bạn:** Nhóm 06 (`EcoTrace` — Chuỗi cung ứng nông sản hữu cơ: `contracts/project/EcoTraceCore.sol`)  
- **Nhóm audit chéo HueLegend:** Nhóm 04 (`AgriTrust` / Nông sản số)  
- **Hợp đồng sản phẩm:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)  
- **Báo cáo audit chính thức:** [`docs/AUDIT_REPORT.md`](./docs/AUDIT_REPORT.md)  
- **Hồ sơ bằng chứng:** [`evidence/lab-14/README.md`](./evidence/lab-14/README.md)  
- **Thông điệp commit chuẩn:**  
  ```bash
  lab-14: xu ly ket qua audit cheo
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 14 (75 phút)

- [x] **Bước 1 — Rà soát mã nguồn nhóm bạn theo 10 hạng mục bắt buộc (45 phút):**
  - Nhận mã nguồn `EcoTraceCore.sol` (284 dòng) và `SPEC.md` từ Nhóm 06 (EcoTrace).
  - Đối chiếu danh mục kiểm tra 10 tiêu chí: Phân quyền, Thứ tự thao tác (CEI), Điều kiện thời gian, Phép chia, Cách chuyển ETH, Dữ liệu riêng tư, Vòng lặp, Sự kiện, Trường hợp số 0, Địa chỉ rỗng.
  - Sử dụng AI Antigravity kết hợp phân tích tĩnh dòng lệnh để trích xuất số dòng chính xác.
- [x] **Bước 2 — Viết báo cáo rà soát chính thức (20 phút):**
  - Lập báo cáo kiểm toán đầy đủ gửi Nhóm 06 gồm 04 phát hiện có trích dẫn số dòng cụ thể:
    1. **Phát hiện 1 (Nghiêm trọng - High):** Lỗ hổng Reentrancy tại dòng 142-151 trong hàm `claimReward()` do chuyển ETH trước khi cập nhật số dư.
    2. **Phát hiện 2 (Trung bình - Medium):** Thiếu Access Control tại dòng 98 trong hàm `updateCertification()`, cho phép bất kỳ ai giả mạo chứng nhận VietGAP.
    3. **Phát hiện 3 (Nhẹ - Low):** Sử dụng `transfer()` tại dòng 215 có nguy cơ làm kẹt gas khi ví nhận là Contract/Multisig.
    4. **Phát hiện 4 (Nhẹ - Low):** Thiếu kiểm tra `address(0)` tại dòng 62 trong hàm `setTreasury()`.
- [x] **Bước 3 — Tiếp thu báo cáo từ Nhóm 04 và Vá lỗi hợp đồng (10 phút):**
  - Nhận báo cáo rà soát từ Nhóm 04 (AgriTrust) đối với `ProjectCore.sol` của HueLegend gồm 3 phát hiện (0 Nghiêm trọng, 1 Trung bình, 2 Nhẹ).
  - Nhóm HueLegend đồng thuận tiếp thu và tiến hành vá ngay trong mã nguồn `ProjectCore.sol`:
    - **Bản vá 1 (Trung bình):** Bổ sung cơ chế hoàn trả tiền thừa `excess = msg.value - batchCreationFee` qua `.call` an toàn theo CEI và phát sự kiện `ExcessFeeRefunded`.
    - **Bản vá 2 (Nhẹ):** Đặt trần độ dài chuỗi ký tự (`MAX_BATCH_CODE_LENGTH = 64`, `MAX_PRODUCT_NAME_LENGTH = 128`, `MAX_LOCATION_LENGTH = 128`) và revert với lỗi tùy biến `StringTooLong`.
    - **Bản vá 3 (Nhẹ):** Dọn dẹp trạng thái `producerUnlockTime[msg.sender] = 0;` khi rút sạch tiền cọc trong hàm `withdrawStake()`.
- [x] **Bước 4 — Kiểm thử thực nghiệm tự động & Biên dịch:**
  - Viết và chạy kịch bản [`test/audit_remediation_test.py`](./test/audit_remediation_test.py): Đạt 3/3 ca kiểm thử (100% PASS).
  - Biên dịch kiểm tra bằng `solc contracts/project/ProjectCore.sol` thành công 0 lỗi.
  - Cập nhật nhật ký kiểm toán vào [`docs/AI_JOURNAL.md`](./docs/AI_JOURNAL.md).

---

## 📌 Bảng tổng hợp kết quả rà soát chéo giữa hai nhóm

| Tiêu chí rà soát | HueLegend audit EcoTrace (Nhóm 06) | AgriTrust audit HueLegend (Nhóm 05) |
|---|:---:|:---:|
| **Số tệp & Dòng mã rà soát** | `EcoTraceCore.sol` (284 dòng) | `ProjectCore.sol` (281 dòng) |
| **Phát hiện Nghiêm trọng (High)** | **01** (Reentrancy trong claimReward) | **00** |
| **Phát hiện Trung bình (Medium)** | **01** (Thiếu Access Control updateCertification) | **01** (Chưa hoàn lại phí thừa tạo lô) |
| **Phát hiện Nhẹ (Low / Info)** | **02** (Dùng transfer & Quên check address 0) | **02** (Spam độ dài String & Reset unlock time) |
| **Tình trạng khắc phục** | Đã bàn giao báo cáo cho Nhóm 06 | **ĐÃ VÁ 100% & KIỂM THỬ THÀNH CÔNG** |

---

## 🚀 Lệnh Git nộp bài chuẩn:
```bash
git add .
git commit -m "lab-14: xu ly ket qua audit cheo"
git push origin main
```
