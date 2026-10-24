# BẰNG CHỨNG THỰC HÀNH LAB 10 — DỰ ÁN HUELEGEND

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Tên dự án nhóm:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm:**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023`
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Tiêu đề commit nộp bài:**
  ```bash
  lab-10: audit va sua loi project core
  ```

---

## 1. Phân tích lỗ hổng trên `VaultBuggy.sol` & Bằng chứng thực nghiệm đọc ô nhớ (Bước 3)

### 1.1. Bảng 4 lỗ hổng cài sẵn trong `VaultBuggy.sol`:
| Lỗ hổng | Dòng mã nguồn | Mô tả chi tiết & Cách khai thác | Cách khắc phục chuẩn |
| :---: | :--- | :--- | :--- |
| **01** | Dòng 8 | **Lộ mã bí mật qua ô nhớ:** Khai báo `uint256 private emergencyPin`. Mọi người đều có thể đọc trực tiếp storage slot 2. | Không lưu trữ mã PIN, mật khẩu dạng rõ trên blockchain; dùng cơ chế Commit-Reveal hash. |
| **02** | Dòng 18-20 | **Rút tiền không kiểm tra quyền:** Hàm `withdraw()` không có `if (msg.sender != owner) revert()`. Bất kỳ ai cũng rút sạch tiền. | Thêm kiểm tra quyền sở hữu `if (msg.sender != owner) revert NotOwner();`. |
| **03** | Dòng 19 | **Đảo ngược logic thời gian:** `require(block.timestamp <= unlockTime)`. Hết hạn khóa thì bị khóa vĩnh viễn. | Sửa thành `if (block.timestamp < unlockTime) revert StillLocked();`. |
| **04** | Dòng 20 | **Dùng `transfer` lỗi thời:** Giới hạn 2.300 gas, dễ bị lỗi Out-of-gas với ví hợp đồng. | Dùng `(bool ok, ) = payable(owner).call{value: amount}("");`. |

### 1.2. Bằng chứng thực nghiệm đọc Storage Slot 2 qua RPC (`eth_getStorageAt`):
Nhóm đã triển khai thực nghiệm thành công với kịch bản kiểm thử [`test/VaultBuggy.test.js`](../../test/VaultBuggy.test.js):
```javascript
const storageValueHex = await ethers.provider.getStorage(vaultBuggyAddress, 2);
console.log("Giá trị Slot 2 (Hex):", storageValueHex);
// Kết quả: 0x000000000000000000000000000000000000000000000000000000000001e240
// Giá trị giải mã sang số thập phân: 123456 (Trùng khớp 100% với _pin ban đầu)
```
> **Kết luận cốt lõi:** Từ khóa `private` trong Solidity chỉ có ý nghĩa kiểm soát mức truy cập giữa các hợp đồng trong mã nguồn, **hoàn toàn không bảo mật dữ liệu trước các trình đọc RPC ngoài chuỗi**.

---

## 2. Báo cáo Audit hợp đồng `ProjectCore.sol` của nhóm (Bước 4)

Nhóm đã rà soát toàn diện `ProjectCore.sol` đối chiếu cùng `SPEC.md` và phát hiện 4 điểm khiếm khuyết:

### Phát hiện 1 (Lỗi nghiệp vụ - AI & Sinh viên phát hiện):
- **Vị trí:** Hàm `createBatch` (Dòng 207).
- **Hậu quả:** Cơ sở sản xuất có thể tạo lô hàng mà chưa nộp tiền ký quỹ `MIN_STAKE_AMOUNT` (0.05 ETH).
- **Cách sửa:** Thêm kiểm tra `if (producerStake[msg.sender] < MIN_STAKE_AMOUNT && msg.sender != owner()) revert StakeTooLow(...)`.

### Phát hiện 2 (Lỗi logic khóa cọc - AI phát hiện):
- **Vị trí:** Hàm `depositStake` (Dòng 155).
- **Hậu quả:** Nạp thêm cọc làm reset lại mốc khóa thêm 30 ngày cho toàn bộ số tiền cũ.
- **Cách sửa:** Chỉ gia hạn mốc mở khóa mới nếu số dư cọc trước đó bằng 0 hoặc đã hết hạn khóa cũ.

### Phát hiện 3 (Lỗi DoS mảng động - AI & Sinh viên phát hiện):
- **Vị trí:** Hàm `addCheckpoint` (Dòng 248).
- **Hậu quả:** Kẻ xấu spam hàng nghìn chặng làm tràn bộ nhớ DApp khi gọi `getCheckpoints`.
- **Cách sửa:** Thêm giới hạn cứng `MAX_CHECKPOINTS_PER_BATCH = 50`.

### Phát hiện 4 (Lỗi nghiệp vụ kiểm định OCOP - Sinh viên tự phát hiện):
- **Vị trí:** Hàm `verifyBatch` (Dòng 272).
- **Hậu quả:** Cho phép chứng nhận OCOP trùng lặp nhiều lần và thiếu hàm thu hồi tem khi mẫu kiểm nghiệm phát hiện vi phạm.
- **Cách sửa:** Thêm kiểm tra `if (_batches[batchCode].isVerified) revert BatchAlreadyVerified(...)` và xây dựng hàm `revokeBatchVerification()`.

---

## 3. Bằng chứng kiểm thử và biên dịch

Toàn bộ các ca kiểm thử sau audit đã được chạy thành công:
```bash
npx hardhat test test/ProjectCore.test.js
npx hardhat test test/VaultBuggy.test.js
```
- Trạng thái biên dịch: **Clean build 100%, không cảnh báo, tuân thủ nghiêm ngặt quy ước AGENTS.md**.
