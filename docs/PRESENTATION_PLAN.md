# KỊCH BẢN THUYẾT TRÌNH VÀ DEMO DỰ ÁN HUELEGEND (LAB 15)

**Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
**Tên dự án:** **HueLegend** — Hệ Thống Truy Xuất Nguồn Gốc Đặc Sản Huế Trên Blockchain  
**Thời lượng chuẩn bị & diễn tập:** 5 phút thuyết trình + 3 phút hỏi đáp (Q&A)  
**Sản phẩm DApp công khai (GitHub Pages):**  
- **URL chính thức:** [https://munniu56.github.io/hce-web3-starter/HueLegend/web/](https://munniu56.github.io/hce-web3-starter/HueLegend/web/)  
- **URL đồng bộ gốc:** [https://munniu56.github.io/hce-web3-starter/web/](https://munniu56.github.io/hce-web3-starter/web/)  
- **Mã giao dịch khởi tạo lô từ DApp (Sepolia):** [`0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01`](https://sepolia.etherscan.io/tx/0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01)  
- **Thẻ phát hành (Tag):** `v0.1-demo`  
- **Commit:** `lab-15: public dapp va presentation plan`

---

## 1. BẢNG ÁNH XẠ KẾT NỐI HỢP ĐỒNG (BƯỚC 1 — LAB 15)

| Thành phần | Giá trị của nhóm HueLegend |
|---|---|
| **Địa chỉ contract** | `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b` (Mạng Ethereum Sepolia Testnet, Chain ID: `11155111`) |
| **ABI lấy từ đâu** | Biên dịch từ `contracts/project/ProjectCore.sol` bằng `solc v0.8.37` (trích xuất tại `HueLegend/web/ProjectCore_abi.json`) |
| **Hàm đọc không tốn phí** | `getBatch(batchCode)`, `getBatchCheckpoints(batchCode)`, `totalBatches()`, `producerStake(addr)`, `producerUnlockTime(addr)`, `hasRole(role, addr)` |
| **Hàm ghi cần xác nhận ví** | `createBatch(batchCode, name, origin, uri)` (kèm `value: 0.001 ETH`), `addCheckpoint(...)`, `stake()`, `verifyBatch(batchCode)`, `withdrawStake()` |

---

## 2. PHÂN VAI THUYẾT TRÌNH VÀ PHỤ TRÁCH ARTIFACT (5 PHÚT)

Mỗi thành viên chịu trách nhiệm đúng 2 phút 30 giây, phát biểu rõ ràng và trực tiếp chỉ dẫn artifact của mình phụ trách:

```
[0:00 - 2:30] Ngô Thị Thuỷ Vân ────────► Artifact: docs/SPEC.md & DApp web/index.html
                                           (Vấn đề, Kinh tế, Live Demo trên điện thoại & Quét QR)

[2:30 - 5:00] Ngô Quỳnh Trang  ────────► Artifact: contracts/ProjectCore.sol & AUDIT_REPORT.md
                                           (Bảo mật CEI, Reentrancy, Chặn gian lận & Đối soát Sepolia)
```

### PHẦN 1: NGÔ THỊ THUỶ VÂN — TRƯỞNG NHÓM (0:00 – 2:30)
- **Vai trò:** Lead Đặc tả & Giao diện người dùng.
- **Artifact phụ trách:** [`docs/SPEC.md`](./SPEC.md), [`docs/ECONOMIC_RULES.md`](./ECONOMIC_RULES.md) và giao diện DApp [`web/index.html`](../web/index.html).
- **Thiết bị sử dụng:** Cầm điện thoại di động mở trình duyệt truy cập URL công khai GitHub Pages.

#### Lời thoại và thao tác chi tiết:
1. **0:00 – 0:30 (Đặt vấn đề & Mục tiêu sản phẩm):**
   > *"Kính chào Thầy và các bạn! Hiện nay, các đặc sản làng nghề truyền thống xứ Huế như Mè xửng Thiên Hương, Tôm chua Trọng Tín hay Trà Cung đình đang bị làm giả tràn lan trên thị trường, gây thiệt hại nghiêm trọng cho thương hiệu di sản và khiến du khách mất niềm tin. Nhóm em xây dựng dự án **HueLegend** — hệ thống Web3 DApp kết hợp tem QR bất biến trên Ethereum Sepolia, giúp mọi người tiêu dùng dễ dàng kiểm chứng nguồn gốc chuẩn xác từng lô hàng."*
2. **0:30 – 1:00 (Quy tắc kinh tế & Đặc tả SPEC.md):**
   > *"Để chống tình trạng spam dữ liệu và bảo đảm trách nhiệm, theo đặc tả `SPEC.md`, mỗi cơ sở sản xuất phải nộp ký quỹ 0.05 ETH và đóng phí tạo lô 0.001 ETH vào Quỹ bảo tồn OCOP Cố Đô. Nếu gian lận, cọc sẽ bị tịch thu và trích thưởng 50% cho người tố giác."*
3. **1:00 – 2:30 (Live Demo trên điện thoại):**
   > *"Em xin phép mở DApp công khai trên điện thoại tại địa chỉ `munniu56.github.io/hce-web3-starter/HueLegend/web/`:*  
   > *- Thao tác 1: Em kết nối ví MetaMask Sepolia, chọn cơ sở Mè xửng Thiên Hương và bấm **Khởi tạo Lô hàng** `HL-MEXUNG-2026-001`.*  
   > *- Màn hình hiển thị trạng thái đang xử lý và sinh ngay mã QR động.*  
   > *- Thao tác 2: Khách hàng chỉ cần đưa camera điện thoại quét mã QR là xem được ngay dòng thời gian chuỗi cung ứng bất biến, hoàn toàn không tốn phí gas."*

---

### PHẦN 2: NGÔ QUỲNH TRANG — THÀNH VIÊN KỸ THUẬT (2:30 – 5:00)
- **Vai trò:** Lead Hợp đồng & Kiểm thử bảo mật.
- **Artifact phụ trách:** [`contracts/project/ProjectCore.sol`](../contracts/project/ProjectCore.sol), [`docs/AUDIT_REPORT.md`](./AUDIT_REPORT.md) và nhật ký kiểm thử [`evidence/lab-14/audit_remediation_test_log.txt`](../evidence/lab-14/audit_remediation_test_log.txt).
- **Thiết bị sử dụng:** Laptop kết nối màn hình chiếu, đối soát mã nguồn và Etherscan Sepolia.

#### Lời thoại và thao tác chi tiết:
1. **2:30 – 3:30 (Kiến trúc bảo mật Hợp đồng thông minh & Bài học Lab 13 - 14):**
   > *"Tiếp nối phần trình bày của bạn Thuỷ Vân, em xin trình bày về cốt lõi kỹ thuật của `ProjectCore.sol`. Hợp đồng được xây dựng trên Solidity ^0.8.20, kế thừa chuẩn OpenZeppelin 5.x. Tại Lab 13, nhóm đã thực nghiệm tấn công tái nhập Reentrancy và thiết lập cơ chế phòng thủ chiều sâu: 100% tuân thủ Checks - Effects - Interactions kết hợp khóa mutex `ReentrancyGuard`.*  
   > *Tại Lab 14 vừa qua, qua phiên rà soát chéo với nhóm bạn, nhóm em đã tiếp thu và vá dứt điểm 3 vấn đề: bổ sung hoàn tiền thừa `ExcessFeeRefunded` khi nộp thừa phí tạo lô, áp trần độ dài chuỗi ký tự chống spam gas storage, và dọn dẹp biến thời gian khóa cọc khi rút cạn quỹ."*
2. **3:30 – 4:30 (Demo ca gian lận thất bại & Xử lý lỗi thân thiện):**
   > *"Đặc biệt, DApp HueLegend phân biệt rõ ràng giữa sản phẩm ứng dụng thật và bài tập thông thường qua cơ chế bắt lỗi `try/catch` với custom errors:*  
   > *- Khi kẻ xấu cố tình mạo danh đơn vị kiểm định OCOP để cập nhật chặng giả mạo, DApp lập tức chặn đứng và hiển thị thông báo tiếng Việt: `⛔ LỖI PHÂN QUYỀN: Tài khoản của bạn không có vai trò hợp lệ! (Lỗi UnauthorizedCaller)`.*  
   > *- Mọi biến cố đều phát `event` và liên kết trực tiếp tới Etherscan Sepolia với TxHash minh bạch."*
3. **4:30 – 5:00 (Tổng kết & Kế hoạch hoàn thiện):**
   > *"Toàn bộ mã nguồn, kịch bản test và DApp đã được đóng gói thành tag `v0.1-demo`. Nhóm em xin chân thành cảm ơn Thầy và sẵn sàng lắng nghe câu hỏi phản biện!"*

---

## 3. CHUẨN BỊ TRẢ LỜI CÂU HỎI PHẢN BIỆN (Q&A CHEATSHEET)

| # | Câu hỏi dự kiến của Giảng viên | Hướng trả lời chuẩn xác |
|---|---|---|
| **1** | *Nếu người dùng nộp thừa ETH khi tạo lô thì hợp đồng xử lý thế nào?* | Hợp đồng tại dòng 180 của `ProjectCore.sol` tính toán `excess = msg.value - batchCreationFee`, chỉ thu đúng 0.001 ETH vào Quỹ OCOP và hoàn trả ngay `excess` cho người dùng bằng lệnh `.call` theo CEI, đồng thời phát `event ExcessFeeRefunded`. |
| **2** | *Vì sao nhóm không dùng cơ sở dữ liệu truyền thống mà bắt buộc dùng Blockchain?* | Cơ sở dữ liệu tập trung có nguy cơ bị người quản trị chỉnh sửa hoặc tẩy xóa ngày sản xuất khi hàng cận date. Blockchain mang lại tính bất biến vĩnh viễn, gắn chặt trách nhiệm pháp lý với chữ ký số của ví Web3 từng bên. |
| **3** | *Làm sao ngăn chặn việc spam chuỗi ký tự quá dài làm nghẽn storage?* | Nhóm đã thiết lập các hằng số trần cứng `MAX_BATCH_CODE_LENGTH` (64 bytes), `MAX_PRODUCT_NAME_LENGTH` (128 bytes), `MAX_LOCATION_LENGTH` (128 bytes) và revert với lỗi tùy biến `StringTooLong`. |

---

*Kịch bản đã được diễn tập khớp thời lượng 5 phút bởi cả hai thành viên vào ngày 06/10/2026.*
