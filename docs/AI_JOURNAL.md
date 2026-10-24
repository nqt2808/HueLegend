# AI_JOURNAL — NHẬT KÝ SỬ DỤNG AI VÀ LỖI ĐÃ PHÁT HIỆN

Dự án: **HueLegend — Nền tảng Truy xuất Đặc sản Huế trên Blockchain**  
Học phần: **ECO2432 — Tiền điện tử & Hợp đồng thông minh**  
Trợ lý AI: **Antigravity IDE (Gemini 3.8 Flash)**

---

## 1. Phiên làm việc khởi tạo cấu trúc dự án & Đặc tả v0.1 (Lab 8)

### Câu lệnh (Prompt) đưa vào:
> *"Tạo cấu trúc dự án chuẩn Lab 8 cho dự án HueLegend về Truy xuất đặc sản Huế. Giải quyết bài toán cơ sở sản xuất và khách mua cần lịch sử lô hàng bất biến. Luồng cốt lõi demo: Tạo lô -> thêm chặng bởi đúng vai -> quét QR xem lịch sử. Tuân thủ tuyệt đối AGENTS.md (Solidity ^0.8.20, CEI, custom error, event, chú thích không dấu, tối thiểu 3 test case gồm ca gian lận)."*

---

## 2. Thực hiện phản biện theo yêu cầu Bước 4 (Lab 8)

Nhóm đã sử dụng prompt chuẩn được quy định trong tài liệu Lab 8 để yêu cầu AI đóng vai người dùng thận trọng phản biện hệ thống:

### Prompt phản biện:
> *"Bạn là người dùng thận trọng. Chỉ dựa trên SPEC và ECONOMIC_RULES dưới đây, hãy nêu 5 cách một người có thể lạm dụng quy tắc hoặc làm người khác bị thiệt. Với mỗi cách, chỉ rõ quy tắc nào chưa đủ chặt. Không viết mã."*

### Kết quả phản biện của AI và Phản hồi/Biện pháp khắc phục của Nhóm:

#### 1. Lạm dụng 1: Nhân bản mã QR dán lên hàng giả (QR Code Replication / Sybil Physical Attack)
- **Hành vi lạm dụng:** Cơ sở sản xuất chỉ tạo 01 lô hàng thật gồm 100 hộp mè xửng on-chain, nhưng in hàng chục nghìn tem QR đó dán lên các sản phẩm làm giả, trôi nổi ngoài thị trường. Khách hàng quét mã QR vẫn thấy dữ liệu on-chain chuẩn chỉ.
- **Quy tắc chưa đủ chặt:** Quy tắc 1 trong `SPEC.md` chỉ quản lý tính duy nhất của mã lô `batchCode`, chưa ràng buộc số lượng đơn vị sản phẩm bán ra thực tế gắn liền với mã lô đó.
- **Biện pháp của Nhóm:** Nhóm sửa quy tắc trong `ECONOMIC_RULES.md` mục 4: Đề xuất triển khai giải pháp **QR kép** (01 mã QR công khai để tra cứu hành trình lô hàng + 01 mã cào phủ bạc chứa Serial Hash ngẫu nhiên bên trong hộp dùng một lần. Khi khách hàng cào xác nhận mua trên DApp, mã Serial bị vô hiệu hóa; nếu quét mã đã cào trước đó, hệ thống sẽ cảnh báo đỏ nguy cơ hàng giả mạo).

#### 2. Lạm dụng 2: Tống tiền hoặc cố tình không ký nhận chặng (Logistics Griefing Attack)
- **Hành vi lạm dụng:** Đơn vị vận chuyển sau khi nhận hàng từ xưởng mè xửng tại Huế cố tình không gọi hàm `addCheckpoint` để vòi vĩnh thêm chi phí từ cơ sở sản xuất, khiến lô hàng bị treo trạng thái trên DApp.
- **Quy tắc chưa đủ chặt:** Quy tắc 2 trong `SPEC.md` cho phép ví có `ROLE_LOGISTICS` thêm chặng nhưng chưa quy định cơ chế xử lý quá hạn (timeout) hoặc quyền chuyển giao chặng khẩn cấp.
- **Biện pháp của Nhóm:** Nhóm sửa quy tắc: Bổ sung cơ chế *Cập nhật chặng khẩn cấp (Emergency Checkpoint)*. Sau 48 giờ kể từ chặng xuất xưởng nếu đơn vị vận chuyển không ký xác thực, Cơ sở sản xuất có quyền đính kèm biên bản giao nhận ngoại vi để đẩy chặng tiếp theo và kích hoạt chế tài trừ điểm uy tín đơn vị vận chuyển.

#### 3. Lạm dụng 3: Vu khống và khiếu nại bừa bãi để nhận thưởng Bounty (False Accusation Exploit)
- **Hành vi lạm dụng:** Kẻ xấu liên tục gửi các báo cáo gian lận nhắm vào các cơ sở sản xuất uy tín nhằm gây nghẽn quy trình thẩm định hoặc câu kết trục lợi 50% tiền ký quỹ.
- **Quy tắc chưa đủ chặt:** Mục 1 trong `ECONOMIC_RULES.md` quy định thưởng 50% tiền cọc cho người tố giác nhưng chưa có chế tài ràng buộc nếu người tố giác khai báo sai sự thật.
- **Biện pháp của Nhóm:** Nhóm bổ sung quy tắc *Ký quỹ khiếu nại (Challenging Stake)* tại Mục 2 `ECONOMIC_RULES.md`: Người gửi đơn tố giác phải ký quỹ `0.01 ETH`. Nếu tố cáo chính xác, nhận lại cọc + thưởng 50% tiền phạt; nếu vu khống sai sự thật, tiền cọc bị tịch thu vào Quỹ OCOP.

#### 4. Lạm dụng 4: Nguy cơ Quản trị viên lạm quyền (Admin Rugpull & Centralization)
- **Hành vi lạm dụng:** Địa chỉ ví `owner` tùy tiện gọi `revokeRole` hoặc kích hoạt lệnh tịch thu tiền ký quỹ của cơ sở sản xuất mà không có sự đồng thuận của cơ quan chức năng.
- **Quy tắc chưa đủ chặt:** Mục 3 trong `ECONOMIC_RULES.md` trao toàn quyền quyết định cho `ROLE_ADMIN` mà chưa áp dụng cơ chế đa chữ ký (Multi-Signature).
- **Phản hồi của Nhóm (Chấp nhận rủi ro có lộ trình):** Trong khuôn khổ **Lab 8**, nhóm chấp nhận dùng một ví Admin để đơn giản hóa quá trình khởi tạo cấu trúc và kiểm thử cục bộ. Nhóm cam kết từ **Lab 11** sẽ nâng cấp lên hợp đồng đa chữ ký (Multi-Sig 2/3 giữa Ban quản lý OCOP, Đại diện làng nghề và Trưởng nhóm kỹ thuật) để kiểm soát việc tịch thu cọc.

#### 5. Lạm dụng 5: Đùn đẩy trách nhiệm khi hàng hóa hư hỏng trong quá trình vận chuyển (Blame Shifting)
- **Hành vi lạm dụng:** Sản phẩm tôm chua bị hỏng do xe vận chuyển tắt điều hòa, nhưng đơn vị vận chuyển đổ lỗi cho cơ sở sản xuất chế biến không đạt chuẩn, hoặc bên bán lẻ bảo quản sai cách.
- **Quy tắc chưa đủ chặt:** Quy tắc 2 chỉ ghi nhận văn bản mô tả chặng mà chưa ràng buộc tiêu chuẩn điều kiện vật lý lúc giao nhận.
- **Biện pháp của Nhóm:** Bổ sung yêu cầu tại Mục 4 `ECONOMIC_RULES.md`: Khi bên bán lẻ (`ROLE_RETAILER`) tiếp nhận hàng, bắt buộc phải chụp ảnh tình trạng niêm phong và ghi chú tình trạng vật lý vào `metadataURI`. Nếu bao bì rách/hỏng trước khi ký nhận, điểm bán từ chối chặng và trách nhiệm thuộc về bên vận chuyển.

---

## 3. Các lỗi kỹ thuật trong mã nguồn được phát hiện và khắc phục (Lab 8)

1. **Lỗi mạo danh vai trò (Role Impersonation):** Ban đầu hàm `addCheckpoint` chỉ nhận chuỗi tên vai trò mà không kiểm tra `msg.sender` có quyền hay không. Nhóm đã bổ sung hằng số `bytes32` (`ROLE_PRODUCER`, `ROLE_LOGISTICS`,...) và kiểm tra `_roles[msg.sender][role]` nghiêm ngặt.
2. **Lỗi tốn gas do revert string dài:** Đã chuyển toàn bộ sang Custom Errors của Solidity `^0.8.20` (`BatchAlreadyExists`, `UnauthorizedCaller`,...).
3. **Tuân thủ quy ước AGENTS.md:** Đã chuẩn hóa toàn bộ chú thích trong hợp đồng sang **tiếng Việt không dấu**.

---

## 4. Phiên làm việc Lab 9: Két tiết kiệm có khóa thời gian (TimeLockVault) & Áp dụng vào ProjectCore

### 4.1. Câu lệnh (Prompt) đưa vào theo yêu cầu Bước 2:
> *"Viết hợp đồng Solidity theo SPEC.md, tuân thủ AGENTS.md. Giải thích lựa chọn thiết kế trước khi đưa mã nguồn."*

### 4.2. Đối chiếu với bản mẫu giảng viên và 4 điểm cốt lõi cần hiểu (Bước 3):
1. **Thứ tự Checks — Effects — Interactions (CEI):** Kiểm tra điều kiện đầu vào trước, cập nhật trạng thái/phát sự kiện trước, và chuyển tiền ra ngoài sau cùng $\rightarrow$ Triệt tiêu nguy cơ Reentrancy.
2. **Custom Errors thay cho chuỗi revert dài:** Tiết kiệm mã bytecode triển khai và hoàn trả gần như toàn bộ gas khi giao dịch bị hoàn tác sớm ở bước Checks.
3. **`call` thay cho `transfer`:** Khắc phục giới hạn cứng 2.300 gas của `transfer`.
4. **Từ khóa `indexed` trong sự kiện:** Đánh dấu địa chỉ `from` và `to` giúp DApp và Etherscan lập chỉ mục tra cứu lịch sử nạp/rút tức thì.

---

## 5. Phiên làm việc Lab 10: Rà soát mã nguồn do AI sinh ra (Audit & Sửa lỗi ProjectCore)

### 5.1. Rà soát hợp đồng huấn luyện `VaultBuggy.sol` (Bước 1 & 2):
**Prompt sử dụng:**
> *"Bạn là kiểm toán viên hợp đồng thông minh. Rà soát hợp đồng dưới đây và liệt kê mọi lỗ hổng, xếp theo mức nghiêm trọng. Với mỗi lỗ hổng, nêu: dòng số mấy, khai thác thế nào, sửa ra sao."*

**Kết quả rà soát 4 lỗi trong `VaultBuggy.sol`:**
1. **Lỗ hổng 1 (Logic ngược thời gian - Dòng 19):** Sử dụng `require(block.timestamp <= unlockTime)` thay vì `>=`. Hậu quả: Khi hết hạn khóa thì bị kẹt tiền vĩnh viễn không thể rút.
2. **Lỗ hổng 2 (Thiếu kiểm soát quyền truy cập - Dòng 18-20):** Hàm `withdraw()` không kiểm tra `msg.sender == owner`. Bất kỳ ai cũng có thể gọi hàm để rút sạch toàn bộ số dư hợp đồng về ví mình.
3. **Lỗ hổng 3 (Dùng transfer lỗi thời - Dòng 20):** Dùng `transfer()` giới hạn cứng 2.300 gas, có thể bị lỗi Out-of-gas nếu người nhận là ví hợp đồng thông minh.
4. **Lỗ hổng 4 (Lộ dữ liệu nhạy cảm biến private - Dòng 8):** Khai báo `uint256 private emergencyPin;` với niềm tin sai lầm rằng `private` là bí mật.

### 5.2. Chứng minh thực nghiệm Bước 3: Đọc trộm ô nhớ Slot 2 (`eth_getStorageAt`):
Nhóm đã triển khai thực nghiệm mã kiểm thử tại [`test/VaultBuggy.test.js`](../test/VaultBuggy.test.js):
- Triển khai hợp đồng với `_pin = 123456`.
- Gọi hàm: `await ethers.provider.getStorage(contractAddress, 2);`
- Giá trị trả về: `0x000000000000000000000000000000000000000000000000000000000001e240` (chính xác là `123456` ở hệ thập phân).
> **Kết luận quan trọng:** Từ khóa `private` trong Solidity chỉ giới hạn quyền truy cập giữa các hợp đồng thông minh, **hoàn toàn không làm dữ liệu trở nên bí mật**. Mọi dữ liệu lưu trên blockchain đều có thể đọc công khai qua RPC.

---

### 5.3. Bảng bắt buộc kết quả Audit trên `ProjectCore.sol` (Bước 4.5):

| Lỗi | Mô tả | Ai phát hiện | Cách khắc phục |
| :---: | :--- | :---: | :--- |
| **1** | Hàm `createBatch` chỉ kiểm tra vai trò `ROLE_PRODUCER` mà chưa kiểm tra cơ sở đã nộp đủ tiền cọc `MIN_STAKE_AMOUNT` (0.05 ETH) hay chưa, dẫn đến rủi ro cơ sở tạo lô ảo không có tài sản bảo đảm. | **AI / Sinh viên** | Thêm điều kiện kiểm tra: `if (producerStake[msg.sender] < MIN_STAKE_AMOUNT && msg.sender != owner()) revert StakeTooLow(...)`. |
| **2** | Khi cơ sở sản xuất nạp thêm tiền cọc bổ sung vào két, hàm `depositStake()` bị lỗi reset lại mốc khóa thời gian `unlockTime` thêm 30 ngày cho toàn bộ số tiền cọc đã nạp từ trước. | **AI** | Sửa logic: Chỉ cập nhật mốc khóa mới nếu cơ sở chưa từng khóa hoặc mốc khóa cũ đã qua thời hạn (`block.timestamp >= producerUnlockTime[msg.sender]`). |
| **3** | Mảng `_batchCheckpoints` không giới hạn số lượng chặng tối đa, kẻ xấu có thể spam gọi `addCheckpoint` hàng trăm lần gây lỗi tràn bộ nhớ (Out-of-memory / RPC limit) khi DApp gọi `getCheckpoints`. | **AI / Sinh viên** | Bổ sung giới hạn cứng `MAX_CHECKPOINTS_PER_BATCH = 50` và hoàn tác với lỗi `MaxCheckpointsExceeded` nếu vượt quá. |
| **4** | Hàm `verifyBatch` cho phép gọi trùng lặp nhiều lần trên cùng một mã lô hàng làm rác dữ liệu, đồng thời thiếu chức năng thu hồi tem OCOP khi cơ quan chức năng phát hiện mẫu vi phạm ATVSTP. | **Sinh viên** *(Tự phát hiện)* | Thêm lỗi `BatchAlreadyVerified`, kiểm tra `!isVerified` trước khi duyệt và xây dựng thêm hàm `revokeBatchVerification()` dành riêng cho `ROLE_INSPECTOR`. |

*(Toàn bộ 4 lỗi trên đã được nhóm sửa triệt để trong mã nguồn [`contracts/project/ProjectCore.sol`](../contracts/project/ProjectCore.sol) và bổ sung ca kiểm thử tự động tại [`test/ProjectCore.test.js`](../test/ProjectCore.test.js))*.

---

## 6. Phiên làm việc Lab 11: Cài đặt quy tắc kinh tế vào sản phẩm & Kiểm thử

### 6.1. Câu lệnh (Prompt) đưa vào theo yêu cầu Bước 3:
> *"Hãy cài đặt quy tắc kinh tế vào hợp đồng ProjectCore.sol của dự án HueLegend: Phí tạo lô hàng batchCreationFee = 0.001 ETH tự động nộp vào Quỹ phát triển OCOP Huế (ecosystemFund). Có trần an toàn Circuit Breaker MAX_BATCH_FEE_LIMIT = 0.01 ETH. Áp dụng chuẩn CEI, custom error, emit event biên lai, chuyển ETH bằng .call và tuân thủ tuyệt đối quy ước AGENTS.md."*

### 6.2. Phân tích bài mẫu `ClassPoint.sol` và 3 điểm cốt lõi (Bước 2):
1. **Điểm cơ bản (Basis Point - BPS):**
   - Trong Solidity không hỗ trợ số thực (float/fixed point). Để tính tỷ lệ phần trăm (1% phí chuyển nhượng), chuẩn tài chính sử dụng `feeBps = 100` trên mẫu số quy ước `10,000` (1 bps = 0.01%, 100 bps = 1.00%). Công thức: `fee = (value * feeBps) / 10_000`. Phép tính luôn nhân trước, chia sau để bảo toàn độ chính xác và tránh bị làm tròn về 0.
2. **Loại trừ chủ sở hữu (`from != owner()`):**
   - Nếu không có điều kiện `from != owner()`, chính lúc triển khai hoặc `owner` phân phát/airdrop điểm thưởng cho sinh viên cũng sẽ bị trừ 1% phí nộp về quỹ lớp, làm thâm hụt tổng lượng token thực tế đưa vào lưu thông. Đây là loại lỗi logic nghiệp vụ mà các công cụ AI thông thường hay bỏ sót nếu người ra lệnh không hiểu sâu về bài toán kinh tế.
3. **Ghi chú về hàm hook `_update` trong OpenZeppelin 5.x:**
   - Trong thư viện OpenZeppelin Contracts 4.x, các hook chuyển token sử dụng hàm `_beforeTokenTransfer` và `_afterTokenTransfer`.
   - Lên phiên bản OpenZeppelin 5.x, toàn bộ các hook trên đã bị gỡ bỏ hoàn toàn và hợp nhất vào một hàm duy nhất là `_update(address from, address to, uint256 value)`.
   - **Thử nghiệm tái tạo lỗi:** Khi cố tình viết theo cú pháp cũ `function _beforeTokenTransfer(...) internal override`, trình biên dịch Solidity sẽ lập tức báo lỗi nghiêm trọng:
     ```text
     TypeError: Function cannot be declared as override as it does not override any function
     ```
   - Nhóm đã nắm chắc nguyên lý này và áp dụng chính xác `_update` cho cả `ClassPoint.sol` và cấu trúc kế thừa trong dự án.

### 6.3. Lựa chọn thiết kế quy tắc kinh tế cho dự án `HueLegend`:
Nhóm đã chọn đúng 01 quy tắc cốt lõi từ [`docs/ECONOMIC_RULES.md`](./ECONOMIC_RULES.md) để cài đặt vào [`contracts/project/ProjectCore.sol`](../contracts/project/ProjectCore.sol):
- **Quy tắc kinh tế:** Phí khởi tạo lô hàng đặc sản `batchCreationFee = 0.001 ETH` nộp vào Quỹ phát triển làng nghề Huế (`ecosystemFund`).
- **Lý do thiết kế:**
  1. Ngăn chặn hành vi spam dữ liệu rác lên blockchain.
  2. Bù đắp chi phí vận hành mạng lưới và trích lập nguồn ngân sách hỗ trợ số hóa cho các làng nghề truyền thống khó khăn tại Thừa Thiên Huế.
  3. Cơ chế **Chuyển tiếp tức thì (Auto-forwarding):** Hợp đồng không lưu giữ tiền phí mà chuyển ngay về ví Quỹ bằng `call{value: msg.value}("")`, giảm thiểu tối đa rủi ro hợp đồng bị tấn công rút tiền.
  4. Cơ chế **Trần an toàn (Circuit Breaker):** Giới hạn `MAX_BATCH_FEE_LIMIT = 0.01 ETH`, ngăn chặn trường hợp Admin bị hack khóa riêng hoặc lạm quyền tự ý tăng phí lên quá cao làm khó các hộ sản xuất nhỏ lẻ.

### 6.4. Báo cáo kết quả kiểm thử (Bước 4):
Nhóm đã triển khai kiểm thử toàn diện tại [`test/ProjectCore.test.js`](../test/ProjectCore.test.js):
1. **Ca kiểm thử hợp lệ (TC-01):**
   - Cơ sở sản xuất nộp đúng `0.001 ETH` khi gọi `createBatch()`.
   - Kết quả: Tạo lô thành công, phát sự kiện `BatchCreated` và `BatchFeeCollected`, số dư ví Quỹ `ecosystemFund` tăng chính xác `0.001 ETH`.
2. **Ca kiểm thử vi phạm quy tắc kinh tế (TC-01b - Nộp thiếu phí):**
   - Cơ sở sản xuất chỉ gửi `0.0005 ETH` khi gọi `createBatch()`.
   - Kết quả: Giao dịch bị từ chối bằng đúng lỗi `InsufficientBatchFee(0.0005 ether, 0.001 ether)`.
3. **Ca kiểm thử vi phạm trần an toàn Circuit Breaker (TC-01c):**
   - Admin cố tình gọi `setBatchCreationFee(0.02 ether)` (> 0.01 ETH).
   - Kết quả: Giao dịch bị hoàn tác với lỗi `FeeExceedsLimit(0.02 ether, 0.01 ether)`.
4. **Ca kiểm thử gian lận quyền hạn (TC-03):**
   - Kẻ xấu không có vai trò hợp lệ cố tình thêm chặng vào lô hàng.
   - Kết quả: Giao dịch bị hoàn tác với lỗi `UnauthorizedCaller`.

---

## 7. Phiên làm việc Lab 12: Gate Review 1 — Duyệt Codebase và Thu hẹp phạm vi

### 7.1. Câu lệnh (Prompt) đưa vào trợ lý AI:
> *"Tiến hành quy trình Gate Review 1 (Lab 12) cho dự án HueLegend:
> 1. Tự kiểm tra sức khỏe repo theo 5 tiêu chí bắt buộc (README, Đặc tả & Mã khớp nhau, ProjectCore.sol biên dịch được, có ca hợp lệ và ca vi phạm bị chặn, lịch sử commit đủ thành viên).
> 2. Soạn kịch bản Demo 3 phút phân chia chuẩn thời gian (30s vấn đề, 30s kinh tế, 60s demo thành công, 30s ca vi phạm, 30s kế hoạch tiếp theo).
> 3. Lập hồ sơ quyết định GATE_REVIEW_1.md: Đưa ra kết luận, 3 việc bắt buộc sửa, danh sách tính năng bị cắt theo nguyên tắc giữ một luồng cốt lõi chạy chắc.
> 4. Cập nhật PROJECT_PLAN.md v0.4 và gán phân công xoay vai Lab 12-15."*

### 7.2. Phân tích của Trợ lý AI và Quyết định kỹ thuật của Nhóm:
1. **Phân tích sức khỏe Codebase:**
   - Trợ lý AI đã hỗ trợ nhóm xây dựng kịch bản kiểm tra tự động `test/repo_health_check.js`, gọi trình biên dịch `solc v0.8.37` biên dịch trực tiếp `ProjectCore.sol` từ hệ thống và chạy script `economic_rules_test.py`.
   - Kết quả: Cả 5/5 tiêu chí đều đạt chuẩn 100%, bảo đảm không có bất kỳ lỗi cú pháp, sai lệch vai trò hoặc lỗi biên dịch tiềm ẩn nào trước buổi thẩm định.
2. **Quyết định thu hẹp phạm vi (Scope Reduction):**
   - AI khuyến nghị nhóm không nên mở rộng dàn trải các tính năng token phụ (ERC-20 BPS) hay hạ tầng IPFS tự dựng vì sẽ làm tăng rủi ro lỗi mạng và thời gian giao dịch trong buổi bảo vệ cuối kỳ.
   - Nhóm thống nhất cắt giảm:
     + Bỏ Utility Token nội bộ, tập trung 100% vào Native ETH cho phí tạo lô và ký quỹ.
     + Bỏ IPFS node riêng, chuyển sang lưu trực tiếp mã băm chứng từ SHA-256 vào `metadataURI`.
     + Bỏ cơ chế Multi-Sig 2/3 phức tạp ngoài chuỗi, duy trì RBAC kết hợp Circuit Breaker on-chain.
3. **Phân công xoay vai Lab 12–15:**
   - Ngô Quỳnh Trang nhận vai trò **Hợp đồng & Kiểm thử** (chịu trách nhiệm chính Lab 13 và Lab 14).
   - Ngô Thị Thuỷ Vân nhận vai trò **Đặc tả & Giao diện** (chịu trách nhiệm chính Lab 15 và cập nhật tài liệu).

---

## 8. Phiên làm việc Lab 13: Thực nghiệm Tấn công Tái nhập (Reentrancy) & Hardening ProjectCore

### 8.1. Câu lệnh (Prompt) dẫn dắt theo yêu cầu Bước 3:
> *"Bạn là kiểm toán viên hợp đồng thông minh. Đừng đưa mã sửa ngay. Hãy giải thích từng bước điều gì xảy ra khi hàm withdraw() dưới đây được gọi bởi một hợp đồng có hàm receive(). Sau đó nêu 2 cách khắc phục và so sánh ưu nhược điểm của từng cách.*  
> `[dán mã VulnerableBank]`*"

### 8.2. Phân tích của Trợ lý AI và Kết quả tiếp thu của Nhóm:
1. **Phân tích cơ chế Reentrancy:**
   - Lệnh `.call` chuyển quyền điều khiển EVM sang hợp đồng ngoài trước khi hợp đồng đích cập nhật trạng thái `balances[msg.sender] = 0`.
   - Hàm `receive()` của kẻ tấn công gọi đệ quy trở lại `withdraw()`. EVM mở frame thực thi mới, thấy số dư vẫn còn $\ge 1\text{ ETH}$ nên tiếp tục gửi tiền, dẫn tới việc rút sạch 6 ETH của ngân hàng.
2. **So sánh 2 cách vá:**
   - *Cách 1 (Checks-Effects-Interactions):* Tối ưu gas, không phụ thuộc thư viện, giải quyết triệt để ở bản chất luồng thực thi kế toán (ghi sổ trước khi chi tiền).
   - *Cách 2 (OpenZeppelin ReentrancyGuard):* Dùng biến cờ khóa `nonReentrant`, bảo vệ an toàn ngay cả các cuộc tấn công phức tạp liên hàm (`cross-function reentrancy`).
3. **Quyết định kỹ thuật áp dụng vào `ProjectCore.sol` (Hardening):**
   - Hợp đồng `ProjectCore.sol` vốn đã áp dụng nghiêm ngặt CEI trong `withdrawStake()` và `createBatch()`.
   - Để đạt chuẩn **Phòng thủ đa tầng (Defense-in-Depth)**, nhóm quyết định kế thừa thêm `ReentrancyGuard` từ OpenZeppelin Contracts 5.x (`import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"`) và gắn modifier `nonReentrant` cho cả hai hàm có tương tác chuyển ETH ngoài chuỗi.
   - Xây dựng bộ test thất bại tự động `test/negative_tests.py` kiểm thử 5 nhóm ca lỗi: Sai thời điểm (`StillLocked`), Sai người (`UnauthorizedCaller`), Sai số tiền (`StakeTooLow`, `InsufficientBatchFee`, `FeeExceedsLimit`), Gọi lại tái nhập, và Dữ liệu trùng lặp (`BatchAlreadyExists`, `MaxCheckpointsExceeded`).

---

## 9. Phiên làm việc Lab 14: Rà soát chéo giữa các nhóm (Cross-Team Audit) & Remediating ProjectCore

### 9.1. Câu lệnh (Prompt) đưa vào trợ lý AI:
> *"Tiến hành rà soát chéo hợp đồng thông minh Lab 14:
> 1. Rà soát hợp đồng EcoTraceCore.sol của nhóm bạn (Nhóm 06) theo danh mục kiểm tra 10 tiêu chí bắt buộc (Phân quyền, Thứ tự thao tác CEI, Điều kiện thời gian, Phép chia, Chuyển ETH, Dữ liệu riêng tư, Vòng lặp, Sự kiện, Trường hợp số 0, Địa chỉ rỗng). Chỉ ra chính xác số dòng, tình huống gây thiệt hại và khuyến nghị.
> 2. Tiếp thu báo cáo rà soát của Nhóm 04 (AgriTrust) đối với ProjectCore.sol của HueLegend, tập trung giải quyết 3 phát hiện: hoàn trả tiền thừa tạo lô (Medium), trần độ dài chuỗi ký tự (Low), và dọn dẹp biến producerUnlockTime khi rút sạch cọc (Low).
> 3. Viết mã sửa chữa tuân thủ nghiêm ngặt quy tắc AGENTS.md (CEI, custom error, chú thích tiếng Việt không dấu) và viết kịch bản kiểm thử xác minh."*

### 9.2. Phân tích của Trợ lý AI và Kết quả tiếp thu của Nhóm:
1. **Phân tích hợp đồng nhóm bạn (EcoTrace):**
   - Trợ lý AI đã hỗ trợ phân tích luồng thực thi và phát hiện lỗ hổng Reentrancy tại dòng 142-151 của `claimReward()` (chuyển ETH trước khi trừ `rewardsBalance`).
   - Phát hiện thêm hàm `updateCertification()` tại dòng 98 thiếu hẳn modifier kiểm tra vai trò Certifier, cho phép bất kỳ ai ghi đè mã chứng chỉ.
   - Tổng hợp thành báo cáo kiểm toán chuyên nghiệp gửi Nhóm 06 kèm số dòng cụ thể.
2. **Phân tích và khắc phục 3 phát hiện của Nhóm 04 đối với HueLegend:**
   - *Phát hiện Trung bình (Hoàn trả phí thừa):* Trước đây hợp đồng chuyển toàn bộ `msg.value` vào `ecosystemFund`. Nếu người dùng nộp thừa (ví dụ 0.003 ETH trong khi phí là 0.001 ETH), 0.002 ETH bị mất. Nhóm tiếp thu và bổ sung tính toán `excess = msg.value - feeToCollect`, chuyển đúng phí vào quỹ và hoàn trả phần dư qua `.call` an toàn theo CEI, đồng thời phát `event ExcessFeeRefunded`.
   - *Phát hiện Nhẹ 1 (Trần độ dài chuỗi):* AI hỗ trợ định nghĩa các hằng số trần cứng `MAX_BATCH_CODE_LENGTH` (64), `MAX_PRODUCT_NAME_LENGTH` (128), `MAX_LOCATION_LENGTH` (128) cùng lỗi tùy biến `StringTooLong` để ngăn chặn triệt để tấn công làm phình to storage và spam gas.
   - *Phát hiện Nhẹ 2 (Dọn dẹp storage cọc):* Khi nhà sản xuất rút hết tiền cọc trong `withdrawStake()`, bổ sung `producerUnlockTime[msg.sender] = 0;` để giải phóng slot và giúp UI Web3 hiển thị trạng thái chính xác.
3. **Kiểm chứng thực nghiệm tự động:**
   - Biên dịch thành công với `solc v0.8.37` (0 lỗi).
   - Kịch bản `test/audit_remediation_test.py` chạy thành công 100% cả 3/3 ca kiểm thử bản vá, lưu log đầy đủ vào `evidence/lab-14/audit_remediation_test_log.txt`.
4. **Hồ sơ bàn giao & Commit:**
   - Toàn bộ nội dung báo cáo rà soát 2 chiều được chuẩn hóa tại `docs/AUDIT_REPORT.md`.
   - Commit nộp bài với thông điệp chuẩn: `lab-14: xu ly ket qua audit cheo`.

---

## 10. Phiên làm việc Lab 15: Hoàn thiện DApp Web3 công khai, Tích hợp Ethers.js v6 & Kịch bản thuyết trình

### 10.1. Câu lệnh (Prompt) đưa vào trợ lý AI:
> *"Tiến hành hoàn thiện bài Lab 15 (Giao diện Web và đưa sản phẩm lên mạng):
> 1. Nối giao diện web với hợp đồng ProjectCore.sol đã triển khai trên Sepolia (0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b), trích xuất và tích hợp compact ABI 50 định nghĩa vào CONTRACT_ABI.
> 2. Lập bảng ánh xạ kết nối 4 thành phần theo đúng yêu cầu đề bài và bổ sung vào README.md.
> 3. Cài đặt cơ chế bắt lỗi try/catch thông minh trên giao diện Web3, dịch tên các custom error (UnauthorizedCaller, InsufficientBatchFee, BatchAlreadyExists, StringTooLong, StillLocked) sang tiếng Việt người dùng dễ hiểu.
> 4. Tinh chỉnh giao diện mobile-responsive theo phong cách Cố Đô Huế hoàng gia (Huế Royal Purple & Golden Lotus), có nút chuyển mạng tự động sang Sepolia (Chain ID 11155111) và hiệu ứng loading rõ ràng.
> 5. Soạn thảo kịch bản trình bày docs/PRESENTATION_PLAN.md chuẩn 5 phút, phân vai 2:30 cho từng thành viên, mỗi người gắn chặt với một artifact chuyên trách."*

### 10.2. Phân tích của Trợ lý AI và Kết quả tiếp thu của Nhóm:
1. **Phân tích kết nối Web3 và Khắc phục bẫy thường gặp:**
   - Trợ lý AI chỉ rõ bẫy phổ biến nhất là người dùng mở DApp bằng ví đang kết nối mạng khác (Mainnet hoặc testnet khác). Giải pháp: Bổ sung đoạn mã kiểm tra `network.chainId === 11155111`, nếu sai sẽ hiển thị banner cảnh báo và kích hoạt `wallet_switchEthereumChain` sang Sepolia.
   - Bẫy thứ hai là người dùng xem link trên điện thoại chưa có MetaMask: Bổ sung chế độ **Interactive Demo Engine / Read-only RPC Fallback** để bất kỳ ai mở link công khai cũng tra cứu và trải nghiệm trọn vẹn luồng sản phẩm mà không bị crash.
2. **Chi tiết bắt lỗi người dùng (Custom Error Translation):**
   - Không hiển thị chuỗi JSON RPC hay stack trace phức tạp. Sử dụng `error.shortMessage || error.message` để ánh xạ chính xác:
     + `UnauthorizedCaller` $\to$ Cảnh báo lỗi phân quyền, thiếu vai trò hợp lệ.
     + `InsufficientBatchFee` $\to$ Nhắc nhở nộp đủ mức phí 0.001 ETH quy định.
     + `BatchAlreadyExists` $\to$ Cảnh báo mã lô đã tồn tại trên chuỗi.
     + `StringTooLong` $\to$ Cảnh báo dữ liệu vượt quá độ dài trần chống spam gas.
3. **Kịch bản phân vai 5 phút:**
   - Ngô Thị Thuỷ Vân phụ trách `docs/SPEC.md` và Live Demo DApp trên điện thoại qua GitHub Pages.
   - Ngô Quỳnh Trang phụ trách `contracts/ProjectCore.sol`, `docs/AUDIT_REPORT.md` và đối soát giao dịch Sepolia.
4. **Đóng gói sản phẩm:**
   - Triển khai công khai tại GitHub Pages: `https://munniu56.github.io/hce-web3-starter/HueLegend/web/`.
   - Tạo tag phát hành: `v0.1-demo` và commit nộp bài: `lab-15: public dapp va presentation plan`.
