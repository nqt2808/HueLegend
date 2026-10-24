# BÁO CÁO RÀ SOÁT CHÉO AN TOÀN HỢP ĐỒNG THÔNG MINH (LAB 14)

**Học phần:** ECO2432 - Phát triển Ứng dụng Web3 & Hợp đồng Thông minh  
**Thời lượng thực hiện:** 75 phút (45 phút rà soát + 20 phút lập báo cáo + 10 phút khắc phục & kiểm thử)  
**Nhóm thực hiện:** Nhóm HueLegend (Nhóm 05)  
- **Thành viên:**  
  1. Ngô Quỳnh Trang - MSSV: 23K4300041  
  2. Ngô Thị Thuý Vân - MSSV: 23K4300023  
**Dự án được phân công audit (nhóm bạn):** Nhóm 06 (Dự án EcoTrace - Chuỗi cung ứng nông sản hữu cơ)  
**Nhóm rà soát chéo HueLegend:** Nhóm 04 (Dự án AgriTrust / Nông sản số)  
**Cam kết tuân thủ:** [AGENTS.md](file:///d:/Antigravity%20IDE/hce-web3-starter/AGENTS.md), Solidity `^0.8.20`, OpenZeppelin Contracts 5.x, CEI Pattern, Custom Errors, Chú thích tiếng Việt không dấu.

---

## MỤC LỤC
1. [BẢNG TỰ KIỂM TRA & RÀ SOÁT CHÉO THEO 10 HẠNG MỤC BẮT BUỘC](#1-bảng-tự-kiểm-tra--rà-soát-chéo-theo-10-hạng-mục-bắt-buộc)
2. [PHẦN A: BÁO CÁO RÀ SOÁT NHÓM BẠN (HUELEGEND AUDIT ECOTRACE)](#2-phần-a-báo-cáo-rà-soát-nhóm-bạn-nhóm-05-audit-nhóm-06-ecotrace)
3. [PHẦN B: BÁO CÁO NHẬN TỪ NHÓM BẠN (AGRITRUST AUDIT HUELEGEND)](#3-phần-b-báo-cáo-nhận-từ-nhóm-bạn-nhóm-04-audit-nhóm-05-huelegend)
4. [PHẦN C: PHẢN HỒI VÀ BIỆN PHÁP KHẮC PHỤC CỦA HUELEGEND](#4-phần-c-phản-hồi-và-biện-pháp-khắc-phục-của-huelegend)
5. [KẾT QUẢ KIỂM THỬ XÁC MINH CÁC BẢN VÁ (VERIFICATION LOG)](#5-kết-quả-kiểm-thử-xác-minh-các-bản-vá-verification-log)
6. [KẾT LUẬN & LIÊN KẾT COMMIT SỬA LỖI](#6-kết-luận--liên-kết-commit-sửa-lỗi)

---

## 1. BẢNG TỰ KIỂM TRA & RÀ SOÁT CHÉO THEO 10 HẠNG MỤC BẮT BUỘC

Bảng checklist dưới đây là tiêu chuẩn đánh giá nghiêm ngặt do giảng viên ban hành cho Lab 14, áp dụng chung cho việc rà soát nhóm bạn và tự rà soát nội bộ:

| # | Hạng mục kiểm tra | Câu hỏi chuẩn mực | Tình trạng tại HueLegend (ProjectCore.sol) | Tình trạng tại Nhóm bạn (EcoTrace) |
|---|---|---|---|---|
| **1** | **Phân quyền** | Mọi hàm nhạy cảm có kiểm tra người gọi không? Có hàm nào quên kiểm tra không? | **ĐẠT:** 100% hàm nhạy cảm có modifier `onlyOwner`, `whenNotPaused`, kiểm tra cọc `minStakeRequirement`. | **LỖI:** Hàm `updateCertification()` thiếu kiểm tra vai trò Certifier hoặc Owner. |
| **2** | **Thứ tự thao tác** | Có hàm nào chuyển tiền ra ngoài trước khi cập nhật biến trạng thái không? | **ĐẠT:** 100% tuân thủ nghiêm ngặt Checks - Effects - Interactions (CEI), sử dụng `ReentrancyGuard`. | **LỖI:** Hàm `claimReward()` chuyển ETH trước khi trừ số dư người dùng (nguy cơ Reentrancy). |
| **3** | **Điều kiện thời gian** | Dấu so sánh có đúng chiều không? Thử nghĩ trường hợp đúng bằng mốc. | **ĐẠT:** Dùng `block.timestamp >= producerUnlockTime[msg.sender]` và so sánh chính xác mốc đáo hạn cọc. | **ĐẠT:** Thời gian khóa hạn mức được so sánh đúng chiều `>=`. |
| **4** | **Phép chia** | Có phép chia nào làm tròn xuống thành 0 với số nhỏ không? | **ĐẠT:** Nhân trước chia sau, dùng Basis Points (`1% = 100 bps`, mẫu số 10,000) giảm thiểu sai số làm tròn. | **CẢNH BÁO:** Phép tính chia tỷ lệ hoa hồng chia trực tiếp cho 100 trước khi nhân số lượng lớn. |
| **5** | **Cách chuyển ETH** | Dùng `call` hay `transfer`? Có kiểm tra kết quả trả về không? | **ĐẠT:** Dùng `.call{value: ...}("")` và kiểm tra boolean `success` kèm custom error `EthTransferFailed`. | **LỖI:** Dùng `payable(msg.sender).transfer(amount)` cũ dễ bị kẹt gas (2300 gas limit). |
| **6** | **Dữ liệu riêng tư** | Có dữ liệu nào tưởng là bí mật nhưng thực ra đọc được không? | **ĐẠT:** Chỉ lưu trữ hash công khai (IPFS hash, batch hash), không lưu dữ liệu bí mật kinh doanh lên blockchain. | **ĐẠT:** Lưu trữ mã kiểm định và thông tin minh bạch. |
| **7** | **Vòng lặp** | Có vòng lặp nào chạy trên danh sách dài không giới hạn không? (vượt gas limit) | **ĐẠT:** Truy vấn O(1) theo mapping và ID, không lặp mảng động. Đã bổ sung trần chuỗi String chống spam gas. | **CẢNH BÁO:** Duyệt mảng `allBatchIds` không phân trang trong hàm đếm nội bộ. |
| **8** | **Sự kiện** | Mọi thay đổi trạng thái có ghi lại sự kiện để tra cứu không? | **ĐẠT:** 100% hàm thay đổi trạng thái phát `event` tương ứng, bổ sung `ExcessFeeRefunded`. | **LỖI:** Hàm `transferBatchOwnership()` đổi trạng thái nhưng quên phát event. |
| **9** | **Trường hợp số 0** | Nạp 0 đồng, rút khi số dư 0, danh sách rỗng — xử lý thế nào? | **ĐẠT:** Đã chặn `amount == 0` bằng custom error `ZeroStakeAmount()`, `InvalidBatchCode()`. | **LỖI:** Cho phép gọi hàm `stake()` với `msg.value == 0` làm loãng danh bạ nhà sản xuất. |
| **10** | **Địa chỉ rỗng** | Có kiểm tra tham số địa chỉ khác `address(0)` không? | **ĐẠT:** Mọi hàm nhận tham số địa chỉ (`setEcosystemFund`, `transferBatch`) đều kiểm tra `InvalidAddress()`. | **LỖI:** Hàm khởi tạo và đổi quỹ đối tác không kiểm tra `address(0)`. |

---

## 2. PHẦN A: BÁO CÁO RÀ SOÁT NHÓM BẠN (NHÓM 05 AUDIT NHÓM 06: ECOTRACE)

### Tóm tắt
- **Đối tượng rà soát:** `contracts/project/EcoTraceCore.sol` (phiên bản cam kết tại commit `lab-13`), tổng cộng **284 dòng mã nguồn** và tài liệu `docs/SPEC.md`.
- **Phát hiện:** Tổng cộng **04 vấn đề** gồm:
  - **01 Nghiêm trọng (High)**
  - **01 Trung bình (Medium)**
  - **02 Nhẹ / Tối ưu hoá (Low / Informational)**

---

### Phát hiện 1 – Lỗ hổng Tái thâm nhập (Reentrancy) do vi phạm Checks-Effects-Interactions trong hàm rút thưởng
- **Mức độ:** **Nghiêm trọng (High)**
- **Vị trí:** Dòng `142` - `151`, hàm `claimReward(uint256 amount)`
- **Mô tả:** Trong hàm `claimReward`, mã nguồn thực hiện chuyển ETH ra ngoài qua `call{value: amount}("")` trước khi trừ số dư `rewardsBalance[msg.sender] -= amount`.
- **Tình huống gây thiệt hại:** Nếu người dùng là một hợp đồng thông minh độc hại có hàm nhận tiền `receive()` gọi đệ quy ngược lại hàm `claimReward()`, kẻ tấn công có thể rút sạch toàn bộ quỹ thưởng của hệ sinh thái trước khi trạng thái số dư được cập nhật.
- **Khuyến nghị:** 
  1. Đổi thứ tự thao tác tuân thủ CEI: cập nhật `rewardsBalance[msg.sender] -= amount;` trước khi gọi `.call`.
  2. Kế thừa và gắn modifier `nonReentrant` của OpenZeppelin.
- **Ai phát hiện:** Thành viên Ngô Quỳnh Trang (dùng AI hỗ trợ phân tích luồng thực thi).

---

### Phát hiện 2 – Hàm thay đổi thông tin chứng nhận quên kiểm tra phân quyền (Missing Access Control)
- **Mức độ:** **Trung bình (Medium)**
- **Vị trí:** Dòng `98`, hàm `updateCertification(uint256 batchId, string memory certUri)`
- **Mô tả:** Hàm `updateCertification` có tầm nhìn `external` nhưng hoàn toàn không có modifier kiểm tra quyền hạn (như `onlyCertifier` hoặc `onlyOwner`), cũng không kiểm tra người gọi có phải là chủ sở hữu của lô hàng hay không.
- **Tình huống gây thiệt hại:** Bất kỳ ai trên Internet đều có thể gửi giao dịch giả mạo đường dẫn chứng chỉ VietGAP/GlobalGAP cho bất kỳ lô hàng nào của nhà sản xuất khác, phá vỡ tính xác thực và uy tín của hệ thống truy xuất nguồn gốc.
- **Khuyến nghị:** Thêm kiểm tra quyền rõ ràng: `require(hasRole(CERTIFIER_ROLE, msg.sender), "Not certifier");` hoặc sử dụng custom error `UnauthorizedCertifier()`.
- **Ai phát hiện:** Thành viên Ngô Thị Thuý Vân.

---

### Phát hiện 3 – Sử dụng phương thức `transfer()` cố định 2300 Gas chuyển tiền
- **Mức độ:** **Nhẹ (Low)**
- **Vị trí:** Dòng `215`, hàm `withdrawFund(address payable to, uint256 amount)`
- **Mô tả:** Hàm rút tiền sử dụng `to.transfer(amount)`.
- **Tình huống gây thiệt hại:** Sau đợt nâng cấp Istanbul/Berlin của Ethereum, chi phí gas của các opcode thay đổi. Nếu địa chỉ nhận tiền là ví đa chữ ký (Multisig như Gnosis Safe) hoặc Proxy contract tiêu tốn trên 2300 gas để ghi log nhận tiền, giao dịch rút tiền sẽ luôn bị revert và làm đóng băng nguồn quỹ.
- **Khuyến nghị:** Chuyển sang sử dụng `(bool success, ) = to.call{value: amount}(""); require(success, "ETH transfer failed");` theo quy định tại `AGENTS.md`.
- **Ai phát hiện:** Công cụ AI Antigravity kết hợp đối chiếu quy chuẩn `AGENTS.md`.

---

### Phát hiện 4 – Không chặn địa chỉ `address(0)` khi cập nhật ví ban quản trị
- **Mức độ:** **Nhẹ (Low)**
- **Vị trí:** Dòng `62`, hàm `setTreasury(address _treasury)`
- **Mô tả:** Hàm thiết lập địa chỉ nhận phí kho bạc không kiểm tra điều kiện `_treasury != address(0)`.
- **Tình huống gây thiệt hại:** Nếu quản trị viên sơ suất truyền nhầm địa chỉ `0x000...000`, toàn bộ phí hệ sinh thái của các giao dịch tiếp theo sẽ bị chuyển vào lỗ đen (burn vĩnh viễn) mà không thể khôi phục.
- **Khuyến nghị:** Bổ sung `if (_treasury == address(0)) revert InvalidAddress();`.
- **Ai phát hiện:** Thành viên Ngô Quỳnh Trang.

---

## 3. PHẦN B: BÁO CÁO NHẬN TỪ NHÓM BẠN (AGRITRUST AUDIT HUELEGEND)

*Dưới đây là nguyên văn báo cáo rà soát chéo mà Nhóm 04 (AgriTrust) đã gửi cho Nhóm HueLegend:*

```markdown
# BÁO CÁO RÀ SOÁT CHÉO — Nhóm 04 (AgriTrust) rà soát Nhóm 05 (HueLegend)

## Tóm tắt
Đã rà soát hợp đồng contracts/project/ProjectCore.sol (281 dòng mã) và docs/SPEC.md.
Hợp đồng của HueLegend có cấu trúc rất vững chắc: 100% tuân thủ CEI, áp dụng OpenZeppelin v5,
sử dụng Custom Errors và ReentrancyGuard chặt chẽ.
Phát hiện: 03 vấn đề (0 Nghiêm trọng, 1 Trung bình, 2 Nhẹ):

## Phát hiện 1 – Không hoàn lại tiền thừa khi nộp phí tạo lô lớn hơn batchCreationFee
- Mức độ: Trung bình (Medium)
- Vị trí: Dòng 173 - 177, hàm createBatch()
- Mô tả: Điều kiện kiểm tra if (msg.value < batchCreationFee) revert InsufficientBatchFee();
  Sau đó hợp đồng chuyển toàn bộ msg.value vào quỹ hệ sinh thái ecosystemFund bằng:
  (bool success, ) = ecosystemFund.call{value: msg.value}("");
- Tình huống gây thiệt hại: Nếu phí tạo lô là 0.001 ETH, nhưng nhà sản xuất vô tình truyền nhầm 
  0.01 ETH hoặc 0.1 ETH trong giao dịch Web3, toàn bộ số tiền vượt mức (0.099 ETH) sẽ bị trừ 
  và gửi thẳng vào quỹ mà không hoàn lại cho người dùng.
- Khuyến nghị: Chỉ thu đúng khoản batchCreationFee cho ecosystemFund, phần thừa 
  (msg.value - batchCreationFee) phải được hoàn trả lại cho msg.sender thông qua lệnh .call an toàn.
- Ai phát hiện: Thành viên Nhóm 04 (Trần Hữu Nam).

## Phát hiện 2 – Thiếu giới hạn độ dài chuỗi ký tự (String Length) đối với dữ liệu lô hàng
- Mức độ: Nhẹ (Low)
- Vị trí: Dòng 166, hàm createBatch(string memory batchCode, string memory productName, ...)
- Mô tả: Hàm createBatch nhận chuỗi ký tự batchCode, productName, originLocation nhưng không 
  kiểm tra độ dài chuỗi tối đa (bytes length).
- Tình huống gây thiệt hại: Người dùng hoặc bot độc hại có thể đẩy các chuỗi văn bản dài hàng 
  chục nghìn byte vào blockchain, gây tốn gas đột biến và làm phình to state storage của mạng lưới.
- Khuyến nghị: Bổ sung hằng số giới hạn trần ký tự (vd: batchCode <= 64, tên <= 128) và revert 
  bằng custom error StringTooLong() nếu vượt quá.
- Ai phát hiện: Công cụ AI của Nhóm 04.

## Phát hiện 3 – Biến thời gian mở khóa cọc producerUnlockTime không được reset khi rút hết cọc
- Mức độ: Nhẹ (Low / Clean Code)
- Vị trí: Dòng 155 - 162, hàm withdrawStake()
- Mô tả: Khi nhà sản xuất rút toàn bộ số tiền cọc (amountToWithdraw = producerStake[msg.sender]), 
  hợp đồng gán producerStake[msg.sender] = 0 nhưng giữ nguyên giá trị producerUnlockTime[msg.sender].
- Tình huống gây thiệt hại: Không gây mất tài sản, nhưng làm sai lệch trạng thái hiển thị (UI Web3 
  có thể hiểu nhầm nhà sản xuất này vẫn còn trong thời hạn khóa cọc hợp lệ).
- Khuyến nghị: Gán producerUnlockTime[msg.sender] = 0 khi số dư cọc về 0 để dọn sạch storage slot 
  và tiết kiệm gas refund.
- Ai phát hiện: Thành viên Nhóm 04 (Lê Văn Hoàng).
```

---

## 4. PHẦN C: PHẢN HỒI VÀ BIỆN PHÁP KHẮC PHỤC CỦA HUELEGEND

Nhóm HueLegend đã tổ chức phiên họp kỹ thuật nội bộ (10 phút) để thảo luận, tiếp thu toàn diện các đóng góp của Nhóm 04 và triển khai vá lỗi ngay lập tức trong tệp hợp đồng [ProjectCore.sol](file:///d:/Antigravity%20IDE/hce-web3-starter/HueLegend/contracts/project/ProjectCore.sol).

### 4.1. Phản hồi chi tiết đối với từng phát hiện

| STT | Phát hiện từ Nhóm bạn | Đánh giá & Phản hồi của HueLegend | Tình trạng xử lý |
|---|---|---|---|
| **1** | **Không hoàn lại tiền thừa khi nộp phí tạo lô** (Trung bình) | **HOÀN TOÀN ĐỒNG Ý.** Đây là phát hiện rất thực tế về trải nghiệm người dùng Web3. Cần thu đúng phí quy định và hoàn tiền thừa ngay trong cùng giao dịch. | **ĐÃ VÁ & KIỂM THỬ THÀNH CÔNG** |
| **2** | **Thiếu giới hạn độ dài chuỗi ký tự chống spam gas** (Nhẹ) | **ĐỒNG Ý.** Việc đặt trần kích thước chuỗi giúp bảo vệ hợp đồng khỏi các cuộc tấn công spam lưu trữ và giữ kích thước khối tối ưu. | **ĐÃ VÁ & KIỂM THỬ THÀNH CÔNG** |
| **3** | **Không reset `producerUnlockTime` khi rút sạch cọc** (Nhẹ) | **ĐỒNG Ý.** Dọn sạch biến lưu trữ khi trạng thái không còn hiệu lực giúp tối ưu hoá dữ liệu và giao diện DApp phản hồi chính xác. | **ĐÃ VÁ & KIỂM THỬ THÀNH CÔNG** |

---

### 4.2. Chi tiết các bản vá mã nguồn trong `ProjectCore.sol`

#### Bản vá 1: Cơ chế hoàn tiền thừa (`Excess Fee Refund`)
- **Định nghĩa sự kiện mới:**
  ```solidity
  event ExcessFeeRefunded(address indexed payer, uint256 refundAmount);
  ```
- **Xử lý hoàn tiền an toàn theo CEI:**
  ```solidity
  // Thu dung phi quy dinh chuyen vao quy he sinh thai
  uint256 feeToCollect = batchCreationFee;
  uint256 excess = msg.value - feeToCollect;

  if (feeToCollect > 0) {
      (bool feeSuccess, ) = ecosystemFund.call{value: feeToCollect}("");
      if (!feeSuccess) revert EthTransferFailed();
  }

  // Hoan tra tien thua cho nguoi dung neu gui vuot muc
  if (excess > 0) {
      (bool refundSuccess, ) = msg.sender.call{value: excess}("");
      if (!refundSuccess) revert EthTransferFailed();
      emit ExcessFeeRefunded(msg.sender, excess);
  }
  ```

#### Bản vá 2: Bổ sung trần độ dài chuỗi ký tự (`String Length Ceiling`)
- **Định nghĩa hằng số và Custom Error:**
  ```solidity
  error StringTooLong(string fieldName, uint256 currentLength, uint256 maxLength);

  uint256 public constant MAX_BATCH_CODE_LENGTH = 64;
  uint256 public constant MAX_PRODUCT_NAME_LENGTH = 128;
  uint256 public constant MAX_LOCATION_LENGTH = 128;
  ```
- **Kiểm tra đầu vào hàm `createBatch()`:**
  ```solidity
  if (bytes(batchCode).length > MAX_BATCH_CODE_LENGTH) {
      revert StringTooLong("batchCode", bytes(batchCode).length, MAX_BATCH_CODE_LENGTH);
  }
  if (bytes(productName).length > MAX_PRODUCT_NAME_LENGTH) {
      revert StringTooLong("productName", bytes(productName).length, MAX_PRODUCT_NAME_LENGTH);
  }
  if (bytes(originLocation).length > MAX_LOCATION_LENGTH) {
      revert StringTooLong("originLocation", bytes(originLocation).length, MAX_LOCATION_LENGTH);
  }
  ```

#### Bản vá 3: Reset `producerUnlockTime` khi rút sạch tiền cọc
- **Cập nhật hàm `withdrawStake()`:**
  ```solidity
  producerStake[msg.sender] = 0;
  producerUnlockTime[msg.sender] = 0; // Reset trang thai mo khoa ve 0
  ```

---

## 5. KẾT QUẢ KIỂM THỬ XÁC MINH CÁC BẢN VÁ (VERIFICATION LOG)

Kịch bản kiểm thử độc lập [audit_remediation_test.py](file:///d:/Antigravity%20IDE/hce-web3-starter/HueLegend/test/audit_remediation_test.py) đã được thực thi trên môi trường mô phỏng Python/Web3. Trích xuất nhật ký thực thi từ [audit_remediation_test_log.txt](file:///d:/Antigravity%20IDE/hce-web3-starter/HueLegend/evidence/lab-14/audit_remediation_test_log.txt):

```text
================================================================================
  KIEM THU CAC BAN VA XU LY KET QUA AUDIT CHEO (LAB 14)
  Du an: HueLegend - Truy xuat dac san Hue tren Blockchain
  Kiem thu vien: Ngo Quynh Trang (23K4300041) & Ngo Thi Thuy Van (23K4300023)
================================================================================

[TEST 1] KIEM THU CO CHE HOAN TRA PHI THUA (EXCESS ETH REFUND - PHAT HIEN TRUNG BINH):
  Kich ban: Co so san xuat nop 0.003 ETH tao lo (trong khi phi quy dinh la 0.001 ETH).
  [+] Quy OCOP nhan duoc: 0.0010 ETH (Chuan 0.0010 ETH)
  [+] Nguoi dung duoc hoan tra: 0.0020 ETH (Chuan 0.0020 ETH)
  => KET QUA: DAT (PASS) - Hoan tra phi thua chinh xac va phat su kien ExcessFeeRefunded!

[TEST 2] KIEM THU TRAN DO DAI CHUOI KY TU CHONG SPAM GAS (PHAT HIEN NHE 1):
  Kich ban 2.1: Co tinh truyen batchCode dai 100 ky tu (> 64 ky tu cho phep).
  [PASS] 2.1 CHAN THANH CONG: Revert dung loi StringTooLong (batchCode vuot tran 64)
  Kich ban 2.2: Co tinh truyen productName dai 200 ky tu (> 128 ky tu cho phep).
  [PASS] 2.2 CHAN THANH CONG: Revert dung loi StringTooLong (productName vuot tran 128)

[TEST 3] KIEM THU RESET PRODUCER_UNLOCK_TIME KHI RUT HET COC (PHAT HIEN NHE 2):
  Kich ban: Co so doi den het han 30 ngay va rut sach 0.05 ETH.
  [+] producerStake sau rut: 0.0 ETH (Bang 0)
  [+] producerUnlockTime sau rut: 0 (Da reset ve 0)
  => KET QUA: DAT (PASS) - Reset sach toan bo trang thai khoa coc!

================================================================================
  TONG KET AUDIT REMEDIATION: 3/3 PHAT HIEN DA DUOC VA TRIET DE VA KIEM THU PASSED 100%!
================================================================================
```

Biên dịch lại hợp đồng bằng trình biên dịch Solidity chuẩn:
```powershell
solc contracts/project/ProjectCore.sol
# Ket qua: Compiler run successful with 0 errors.
```

---

## 6. KẾT LUẬN & LIÊN KẾT COMMIT SỬA LỖI

Hoạt động rà soát chéo giữa các nhóm tại Lab 14 đã chứng minh vai trò tối quan trọng của việc kiểm tra bảo mật độc lập:
1. **Tinh thần rà soát khách quan:** Giúp nhóm bạn (EcoTrace) phát hiện lỗ hổng Reentrancy và thiếu phân quyền nguy hiểm trước khi bước vào giai đoạn kiểm thử tích hợp cuối kỳ.
2. **Nâng cấp độ hoàn thiện của HueLegend:** Tiếp thu báo cáo của Nhóm 04, giải quyết triệt để vấn đề rủi ro mất tiền thừa của người dùng, ngăn chặn spam gas lưu trữ và dọn sạch trạng thái giải phóng cọc.
3. **Mã thông điệp commit nộp bài:**
   ```bash
   git commit -m "lab-14: xu ly ket qua audit cheo"
   ```

*Báo cáo được hoàn thành và phê duyệt bởi toàn thể thành viên Nhóm HueLegend vào ngày 06/10/2026.*
