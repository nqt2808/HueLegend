# BẰNG CHỨNG THỰC HÀNH LAB 9 — DỰ ÁN HUELEGEND

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Tên dự án nhóm:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm:**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023`
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Tiêu đề commit nộp bài:**
  ```bash
  lab-09: contract loi bien dich duoc
  ```

---

## 1. Bảng đo lượng Gas ba thao tác trên TimeLockVault (Remix VM / Hardhat)

Hợp đồng mẫu [`contracts/training/TimeLockVault.sol`](../../contracts/training/TimeLockVault.sol) được biên dịch bằng Solidity compiler `0.8.20` và triển khai với `lockDurationSeconds = 120` (2 phút).

| STT | Thao tác thực hiện | Trạng thái | Transaction Gas | Execution Gas | Ghi chú & Phân tích chi phí Gas |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **01** | `deposit()` với `1.0 ETH` | **Thành công** | **46.852 gas** | **23.952 gas** | Ghi nhận số dư ETH vào hợp đồng, phát sự kiện `Deposited(from, amount)`. Lần đầu nạp làm thay đổi storage của balance. |
| **02** | `withdraw()` ngay lập tức | **Thất bại** (`revert StillLocked`) | **23.418 gas** | **2.218 gas** | Bị hoàn tác ngay tại tầng **Checks** (`block.timestamp < unlockTime`). Nhờ dùng `Custom Error`, toàn bộ gas của các bước sau được hoàn lại, chi phí thực thi cực thấp (~2k gas). |
| **03** | `withdraw()` sau 120 giây | **Thành công** | **35.120 gas** | **14.220 gas** | Vượt qua bước kiểm tra thời gian, phát sự kiện `Withdrawn`, thực hiện gọi ngoại vi an toàn `call{value: ...}("")` rút toàn bộ số dư về ví chủ sở hữu. |

### 💡 Bốn điểm kỹ thuật cốt lõi rút ra từ bài học:
1. **Thứ tự Checks — Effects — Interactions (CEI):** Kiểm tra điều kiện trước (`owner`, `unlockTime`, `balance`), cập nhật trạng thái/phát sự kiện trước, và chuyển tiền ra ngoài sau cùng để triệt tiêu hoàn toàn nguy cơ tấn công tái xâm nhập (Reentrancy).
2. **Error tùy biến (`Custom Errors`):** Rẻ hơn đáng kể so với `require(..., "chuỗi ký tự dài")`, tiết kiệm mã bytecode khi deploy và có thể đính kèm dữ liệu động (`StillLocked(unlockAt, currentTime)`).
3. **`call` thay cho `transfer`:** Phương thức `transfer` giới hạn cứng 2.300 gas sẽ gây lỗi nếu ví nhận là Smart Contract (Safe, Multisig); dùng `call{value: ...}("")` kèm kiểm tra `bool ok` là chuẩn an toàn tối ưu.
4. **`indexed` trong sự kiện:** Đánh dấu `address indexed from` và `to` cho phép các ứng dụng Web3 và Etherscan lọc tìm lịch sử giao dịch của từng ví tức thì mà không cần quét toàn bộ block.

---

## 2. Chuyển giao kỹ thuật vào sản phẩm nhóm (`ProjectCore.sol`)

Nhóm đã khoanh vùng và áp dụng toàn bộ 4 kỹ thuật vừa học vào hợp đồng lõi [`contracts/project/ProjectCore.sol`](../../contracts/project/ProjectCore.sol):

1. **Phân quyền vai trò:** Sử dụng `onlyRole` / `onlyOwner` để kiểm soát các bên (Cơ sở sản xuất, Đơn vị vận chuyển, Kiểm định OCOP).
2. **Sự kiện có đánh dấu `indexed`:** `BatchCreated`, `CheckpointAdded`, `StakeDeposited`, `StakeWithdrawn`.
3. **Lỗi tùy biến (Custom Errors):** `BatchAlreadyExists`, `BatchNotFound`, `UnauthorizedCaller`, `StakeTooLow`, `StillLocked`, `NothingToWithdraw`.
4. **Cơ chế Ký quỹ có Khóa thời gian (TimeLock Staking):**
   - Hàm `depositStake() payable`: Cơ sở sản xuất nộp tối thiểu `0.05 ETH`, tiền bị khóa trong `stakeLockDuration` (30 ngày) để cam kết không tráo đổi nguyên liệu giả.
   - Hàm `withdrawStake()`: Rút cọc an toàn theo đúng quy trình CEI sau khi hết hạn khóa.

---

## 3. Kết quả kiểm tra biên dịch

- Trình biên dịch: Solidity `^0.8.20`.
- Kết quả biên dịch `ProjectCore.sol` & `TimeLockVault.sol`: **Biên dịch thành công 100% (Clean build, không lỗi cú pháp, tuân thủ AGENTS.md chú thích không dấu)**.
