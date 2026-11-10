# SPEC — ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG TRUY XUẤT ĐẶC SẢN HUẾ (HUELEGEND v0.3)

## 1. Mục đích
Hệ thống **HueLegend** ứng dụng công nghệ Blockchain (Ethereum Sepolia) nhằm minh bạch hóa toàn diện chuỗi cung ứng các đặc sản truyền thống xứ Huế (Mè xửng, Tôm chua, Trà Cung đình, Tinh dầu tràm, Nón bài thơ). Hệ thống cung cấp cơ chế lưu trữ lịch sử bất biến on-chain giúp bảo vệ uy tín các làng nghề OCOP và trao quyền cho người tiêu dùng tự kiểm chứng nguồn gốc sản phẩm qua mã QR.

---

## 2. Người dùng và Đối tượng thụ hưởng (Actors)
- **Cơ sở sản xuất (`ROLE_PRODUCER`):** Hộ sản xuất, hợp tác xã làng nghề Huế (ví dụ: Mè xửng Thiên Hương, Tôm chua Trọng Tín,...).
- **Đơn vị vận chuyển (`ROLE_LOGISTICS`):** Đơn vị giao vận đường bộ, đường sắt (Ga Huế), hàng không (Sân bay Phú Bài).
- **Đại lý / Cửa hàng bán lẻ (`ROLE_RETAILER`):** Điểm bán quà lưu niệm, siêu thị đặc sản tại Huế, Hà Nội, TP.HCM.
- **Cơ quan kiểm định (`ROLE_INSPECTOR`):** Chi cục Quản lý Chất lượng Nông Lâm Thủy sản TT Huế, Ban quản lý OCOP.
- **Khách mua hàng (Người dùng phổ thông / Consumer):** Du khách, người tiêu dùng quét mã QR tra cứu miễn phí.
- **Quỹ phát triển đặc sản OCOP Huế (`ecosystemFund`):** Địa chỉ ví chuyên biệt tiếp nhận phí tạo lô để bảo trì hạ tầng và tài trợ làng nghề.

---

## 3. Đầu vào và Đầu ra

### 3.1. Dữ liệu đầu vào
- Mã định danh lô hàng (`batchCode`): chuỗi ký tự duy nhất (ví dụ: `HL-MEXUNG-2026-001`).
- Tên đặc sản (`productName`): tên sản phẩm làng nghề được bảo hộ.
- Vùng nguyên liệu (`origin`): địa danh xuất xứ nguyên liệu sạch tại Thừa Thiên Huế.
- Thông tin chặng: địa điểm (`location`), hành động thực hiện (`action`), đường dẫn chứng từ kiểm định (`metadataURI`).
- Tiền nạp ký quỹ bảo đảm uy tín làng nghề (`msg.value` khi gọi `depositStake`).
- Phí khởi tạo lô hàng bắt buộc (`msg.value >= batchCreationFee = 0.001 ETH` khi gọi `createBatch`).
- Chữ ký xác thực của ví Web3 gửi giao dịch (`msg.sender`).

### 3.2. Dữ liệu đầu ra
- Lịch sử chuỗi cung ứng bất biến dạng dòng thời gian (Timeline) bao gồm: thời gian khối, người ký, vai trò, địa điểm, hành động, mã băm giao dịch (TxHash).
- Mã phản hồi nhanh (QR Code) động liên kết trực tiếp đến trang tra cứu lô hàng.
- Trạng thái kiểm định OCOP (`isVerified`: `true`/`false`).
- Số dư tiền ký quỹ và thời gian mở khóa cọc của cơ sở sản xuất.
- Sự kiện biên lai thu phí `BatchFeeCollected` và biến động số dư ví `ecosystemFund`.

---

## 4. Bốn quy tắc nghiệp vụ chuỗi cung ứng cốt lõi (Core Supply Chain Rules)

### Quy tắc 1 (Khởi tạo lô đặc sản & Nộp phí tạo lô - Batch Creation & Economic Fee - Lab 11)
- **Ai được làm gì:** Chỉ địa chỉ ví được cấp quyền `ROLE_PRODUCER` (hoặc `owner`) đã nộp đủ tiền cọc `MIN_STAKE_AMOUNT` (0.05 ETH) mới được gọi hàm `createBatch`.
- **Khi nào:** Khi sản phẩm hoàn thành chế biến tại xưởng và chuẩn bị đóng gói dán tem truy xuất nguồn gốc.
- **Ràng buộc kinh tế (Economic Rule):**
  - Cơ sở sản xuất bắt buộc phải gửi kèm khoản phí `batchCreationFee = 0.001 ETH` trong giao dịch (`msg.value`).
  - Toàn bộ khoản phí được hợp đồng tự động chuyển tiếp (auto-forward) sang ví Quỹ phát triển OCOP Huế (`ecosystemFund`) bằng lệnh `call{value: msg.value}("")` an toàn và phát sự kiện `BatchFeeCollected`.
  - Hạn mức an toàn (Circuit Breaker): Quản trị viên (`owner`) chỉ được phép điều chỉnh mức phí tối đa `MAX_BATCH_FEE_LIMIT = 0.01 ETH`.
- **Giới hạn bao nhiêu:** Mỗi mã lô (`batchCode`) là chuỗi không rỗng và chỉ được tạo duy nhất một lần trên toàn mạng lưới (`batchCode` không được trùng lặp).
- **Lỗi thì sao:** 
  - Nếu không có quyền $\rightarrow$ Revert `UnauthorizedCaller(msg.sender, ROLE_PRODUCER)`.
  - Nếu chưa nộp đủ tiền cọc bảo đảm uy tín $\rightarrow$ Revert `StakeTooLow(provided, minimum)`.
  - Nếu nộp thiếu hoặc không nộp phí tạo lô $\rightarrow$ Revert `InsufficientBatchFee(provided, requiredFee)`.
  - Nếu mã lô đã tồn tại $\rightarrow$ Revert `BatchAlreadyExists(batchCode)`.
  - Nếu để trống thông tin $\rightarrow$ Revert `EmptyString(fieldName)`.
  - Nếu Admin cố tình set phí vượt hạn mức an toàn $\rightarrow$ Revert `FeeExceedsLimit(attempted, maxLimit)`.

### Quy tắc 2 (Thêm chặng theo đúng vai - Role-based Checkpoint)
- **Ai được làm gì:** Địa chỉ ví nắm giữ đúng vai trò `role` được khai báo (`ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_INSPECTOR`, `ROLE_PRODUCER`) mới được gọi `addCheckpoint`.
- **Khi nào:** Khi lô hàng được tiếp nhận, chuyển giao, lưu kho hoặc kiểm tra điều kiện bảo quản tại một địa điểm mới.
- **Giới hạn bao nhiêu:** Lô hàng mục tiêu phải đang tồn tại trên chuỗi (`exists == true`). Mỗi giao dịch ghi nhận đúng 1 chặng kèm chữ ký ví của người gửi.
- **Lỗi thì sao:**
  - Nếu mã lô không tồn tại $\rightarrow$ Revert `BatchNotFound(batchCode)`.
  - Nếu ví gửi giao dịch không sở hữu vai trò tương ứng $\rightarrow$ Revert `UnauthorizedCaller(msg.sender, role)`.

### Quy tắc 3 (Thẩm định và Cấp chứng nhận OCOP - Inspection Verification)
- **Ai được làm gì:** Chỉ cơ quan kiểm định độc lập nắm giữ vai trò `ROLE_INSPECTOR` mới được gọi hàm `verifyBatch`.
- **Khi nào:** Sau khi tiến hành lấy mẫu kiểm nghiệm vi sinh, vệ sinh ATVSTP và thẩm định hồ sơ làng nghề đạt chuẩn.
- **Giới hạn bao nhiêu:** Chỉ thực hiện trên lô hàng đã tồn tại. Cờ `isVerified` được chuyển sang `true` và tự động ghi nhận chặng kiểm định có gắn link chứng chỉ IPFS.
- **Lỗi thì sao:** Nếu ví không phải là `ROLE_INSPECTOR` $\rightarrow$ Revert `UnauthorizedCaller(msg.sender, ROLE_INSPECTOR)`.

### Quy tắc 4 (Tra cứu và Quét mã QR - Public Free Traceability)
- **Ai được làm gì:** Bất kỳ ai (Khách du lịch, người tiêu dùng, thanh tra thị trường) đều có thể gọi các hàm truy vấn `getBatch` và `getCheckpoints`.
- **Khi nào:** Bất kỳ lúc nào, thông qua trình duyệt hoặc quét camera mã QR trên bao bì sản phẩm.
- **Giới hạn bao nhiêu:** Không giới hạn số lần truy vấn, không yêu cầu người dùng phải sở hữu ví Web3 hay có số dư ETH (hàm `view` đọc dữ liệu off-chain hoàn toàn miễn phí gas).
- **Lỗi thì sao:** Nếu nhập mã lô không tồn tại $\rightarrow$ Revert `BatchNotFound(batchCode)`.

---

## 5. Đặc tả mô hình Két Ký quỹ Khóa thời gian (Áp dụng từ Lab 9 TimeLockVault)

Học phần Lab 9 cung cấp nền tảng **Két tiết kiệm có khóa thời gian (`TimeLockVault`)** — mô hình ký gửi có điều kiện, nền móng của cơ chế giữ hộ tiền cọc bảo đảm chất lượng của làng nghề trong HueLegend.

### 5.1. Năm quy tắc chuẩn của Két khóa thời gian (TimeLockVault Rules)
- **R-TL1:** Ai cũng nạp được tiền vào két (`deposit() payable`).
- **R-TL2:** Chỉ người tạo két (`owner`) mới có quyền rút tiền (`withdraw()`).
- **R-TL3:** Chỉ rút được tiền khi thời điểm hiện tại của block đã qua mốc mở khóa (`block.timestamp >= unlockTime`).
- **R-TL4:** Số tiền nạp vào két phải lớn hơn 0 (`msg.value > 0`), nạp 0 sẽ bị từ chối với lỗi `ZeroAmount()`.
- **R-TL5:** Mọi lần nạp và rút tiền đều phải phát sự kiện (`Deposited`, `Withdrawn`) có đánh dấu `indexed` để phục vụ tra cứu minh bạch.

### 5.2. Chuyển giao kỹ thuật vào luồng cốt lõi của HueLegend (`ProjectCore.sol`)
Trong dự án HueLegend, nhóm chuyển giao trọn vẹn 4 kỹ thuật cốt lõi vừa học vào chức năng **Ký quỹ bảo đảm uy tín làng nghề (Reputation Staking with TimeLock)**:
1. **Phân quyền chặt chẽ:** Chỉ ví sở hữu `ROLE_PRODUCER` nộp tiền cọc và chỉ chính ví đó mới được rút cọc khi hết hạn.
2. **Sự kiện minh bạch:** Phát `StakeDeposited(producer, amount, unlockTime)` và `StakeWithdrawn(producer, amount)`.
3. **Lỗi tùy biến (Custom Errors):** `StakeTooLow()`, `StillLocked(unlockAt, currentTime)`, `NothingToWithdraw()`, `TransferFailed()`.
4. **Quy trình Checks — Effects — Interactions (CEI):** Kiểm tra điều kiện thời gian trước $\rightarrow$ Xóa số dư cọc về 0 $\rightarrow$ Phát sự kiện $\rightarrow$ Chuyển ETH ra ngoài bằng `call{value: ...}("")`.

---

## 6. Đặc tả Quy tắc Kinh tế & Kịch bản Kiểm thử (Áp dụng từ Lab 11)

### 6.1. Quy tắc kinh tế lựa chọn
Trong Lab 11, nhóm HueLegend chọn cài đặt quy tắc kinh tế: **Phí khởi tạo lô hàng đặc sản (`batchCreationFee = 0.001 ETH`) tự động nộp vào Quỹ phát triển OCOP Huế (`ecosystemFund`)**.
- **Cơ chế thu phí:** Khi cơ sở sản xuất tạo lô hàng (`createBatch`), hợp đồng bắt buộc kiểm tra `msg.value >= batchCreationFee`.
- **Chuyển tiền tự động (Auto-forwarding):** Tiền phí được chuyển ngay sang ví `ecosystemFund` bằng `call{value: msg.value}("")` tuân thủ nghiêm ngặt CEI.
- **Hạn mức an toàn (Circuit Breaker):** Admin chỉ được phép cập nhật mức phí tối đa `MAX_BATCH_FEE_LIMIT = 0.01 ETH`.

### 6.2. Kịch bản kiểm thử (Test Cases)
1. **Ca kiểm thử hợp lệ (Valid Case):**
   - Tài khoản có vai trò `ROLE_PRODUCER` đã nộp đủ tiền cọc (0.05 ETH) gọi `createBatch()` gửi kèm đúng 0.001 ETH.
   - Kết quả mong đợi: Giao dịch thành công, phát sự kiện `BatchCreated` và `BatchFeeCollected`, số dư ví `ecosystemFund` tăng chính xác 0.001 ETH.
2. **Ca kiểm thử vi phạm kinh tế (Economic Violation Case):**
   - Tài khoản `ROLE_PRODUCER` gọi `createBatch()` nhưng gửi thiếu phí (ví dụ 0.0005 ETH).
   - Kết quả mong đợi: Giao dịch bị hoàn tác với lỗi tùy biến `InsufficientBatchFee(0.0005 ether, 0.001 ether)`.
3. **Ca kiểm thử vi phạm hạn mức an toàn (Circuit Breaker Violation Case):**
   - Admin cố tình thiết lập mức phí mới là 0.02 ETH (> 0.01 ETH).
   - Kết quả mong đợi: Giao dịch bị hoàn tác với lỗi tùy biến `FeeExceedsLimit(0.02 ether, 0.01 ether)`.
4. **Ca kiểm thử gian lận quyền hạn (Fraud Case):**
   - Tài khoản lạ không có quyền `ROLE_PRODUCER` cố tình gọi `createBatch()` hoặc `addCheckpoint()`.
   - Kết quả mong đợi: Giao dịch bị hoàn tác với lỗi `UnauthorizedCaller`.

---

## 7. Cơ chế Phòng thủ Tái nhập & Bộ Kiểm thử Thất bại (Negative Tests - Lab 13)

### 7.1. Tăng cường an ninh đa tầng (Defense-in-Depth Hardening)
Trong Lab 13, nhóm đã tiến hành rà soát mọi điểm có dòng tiền chuyển ra (`withdrawStake`, `createBatch`) và tăng cường hai tầng phòng thủ:
1. **Tầng 1 — Checks-Effects-Interactions (CEI):** Mọi trạng thái lưu trữ nội bộ (`producerStake`, `_batches`) bắt buộc phải ghi sổ và cập nhật hoàn tất trước khi kích hoạt bất kỳ lệnh chuyển tiền ngoài chuỗi nào (`.call`).
2. **Tầng 2 — OpenZeppelin ReentrancyGuard:** Kế thừa thư viện `@openzeppelin/contracts/utils/ReentrancyGuard.sol` và gắn modifier `nonReentrant` trên cả `withdrawStake()` và `createBatch()`, chặn đứng hoàn toàn mọi nỗ lực đệ quy tái nhập trong cùng một giao dịch.

### 7.2. Đặc tả 5 nhóm ca kiểm thử thất bại (Negative Test Cases):
1. **Sai thời điểm (Timelock Violation):** Rút cọc khi chưa hết hạn khóa 30 ngày $\rightarrow$ Revert `StillLocked(unlockAt, currentTime)`.
2. **Sai người (Unauthorized Caller):** Mạo danh các vai trò `ROLE_PRODUCER`, `ROLE_LOGISTICS`, `ROLE_INSPECTOR` $\rightarrow$ Revert `UnauthorizedCaller(caller, requiredRole)`.
3. **Sai số tiền (Economic & Circuit Breaker):** Nạp thiếu cọc `< 0.05 ETH` $\rightarrow$ Revert `StakeTooLow`; Nộp thiếu phí tạo lô `< 0.001 ETH` $\rightarrow$ Revert `InsufficientBatchFee`; Admin set phí `> 0.01 ETH` $\rightarrow$ Revert `FeeExceedsLimit`.
4. **Gọi lại (Reentrancy Attack Attempt):** Hợp đồng kẻ tấn công gọi đệ quy ngược lại hàm `withdrawStake()` trong callback `receive()` $\rightarrow$ Hoàn tác và chặn đứng bởi CEI và `ReentrancyGuard`.
5. **Dữ liệu lỗi & Giới hạn DoS (Spam Protection):** Tạo trùng mã lô đã tồn tại $\rightarrow$ Revert `BatchAlreadyExists`; Thêm quá 50 chặng trên 1 lô hàng $\rightarrow$ Revert `MaxCheckpointsExceeded`.


