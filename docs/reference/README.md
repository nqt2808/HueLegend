# HueLegend — Hệ Thống Truy Xuất Nguồn Gốc Đặc Sản Huế Trên Blockchain

> **Câu giới thiệu sản phẩm (Checkpoint 1):**  
> *"Nhóm xây HueLegend cho các cơ sở làng nghề và du khách mua đặc sản Huế để minh bạch lịch sử nguồn gốc từng lô hàng qua mã QR bất biến trên blockchain."*

---

## 🧭 BỐN CÂU HỎI ĐẦU RA THEO CHUẨN LAB 8

| Câu hỏi | Câu trả lời của dự án HueLegend |
| :--- | :--- |
| **1. Nhóm làm gì?** | Xây dựng hệ thống Web3 DApp và Smart Contract trên Ethereum Sepolia để ghi nhận, xác thực và truy xuất lịch sử chuỗi cung ứng bất biến cho các đặc sản truyền thống xứ Huế (Mè xửng, Tôm chua, Trà Cung đình, Tinh dầu tràm, Nón bài thơ). |
| **2. Làm cho ai?** | - **Cơ sở sản xuất & Hợp tác xã làng nghề:** Minh bạch nguồn gốc, bảo vệ thương hiệu độc quyền.<br>- **Đơn vị vận chuyển & Điểm bán lẻ:** Xác nhận trách nhiệm bàn giao rõ ràng.<br>- **Du khách & Người tiêu dùng:** Quét mã QR kiểm chứng hàng thật, an tâm về chất lượng. |
| **3. Quy tắc chính là gì?** | 1. **Khởi tạo lô:** Chỉ cơ sở có `ROLE_PRODUCER` mới được tạo mã lô duy nhất kèm thông tin xưởng.<br>2. **Thêm chặng theo vai:** Phải có đúng vai trò (`ROLE_LOGISTICS`, `ROLE_RETAILER`,...) mới được ký giao dịch ghi nhận chặng.<br>3. **Chống gian lận:** Mạo danh bị revert ngay lập tức (`UnauthorizedCaller`); cơ sở gian lận bị tịch thu cọc 0.05 ETH trích thưởng 50% cho người tố giác.<br>4. **Tra cứu tự do:** Người mua quét QR xem dòng thời gian (timeline) hoàn toàn miễn phí gas. |
| **4. Mỗi thành viên chịu trách nhiệm phần nào?** | - **Ngô Thị Thuỷ Vân** *(23K4300023 - Trưởng nhóm):* Vai chính Lab 8–11: Hợp đồng & Kiểm thử \| Vai chính Lab 12–15: Đặc tả & Giao diện.<br>- **Ngô Quỳnh Trang** *(23K4300041):* Vai chính Lab 8–11: Đặc tả & Giao diện \| Vai chính Lab 12–15: Hợp đồng & Kiểm thử. |

---

## 🚀 Luồng cốt lõi Demo (Core Workflow)

```
[1. Tạo lô đặc sản]           [2. Thêm chặng bởi đúng vai]           [3. Quét QR xem lịch sử]
  (Cơ sở sản xuất)         (Vận chuyển / Kiểm định / Điểm bán)         (Khách mua hàng)
         │                                   │                                │
         ▼                                   ▼                                ▼
- Nhập thông tin lô hàng            - Kiểm tra quyền ví on-chain       - Quét camera mã QR
- Ký giao dịch khởi tạo             - Xác thực đúng vai trò hợp lệ     - Xem timeline từng chặng
- Tự động sinh mã QR động           - Ngăn chặn mạo danh (Revert)      - Đối soát TxHash Sepolia
```

---

## 📂 Cấu trúc thư mục dự án (Chuẩn Lab 8)

```text
HueLegend/
├── README.md               # Giới thiệu sản phẩm, chuẩn 4 câu hỏi đầu ra và hướng dẫn chạy
├── AGENTS.md               # Quy ước kỹ thuật và nguyên tắc sinh mã cho công cụ AI
├── lab08.md                # Tóm tắt thực hành Lab 8 và mẫu commit nộp bài
├── lab09.md                # Tóm tắt thực hành Lab 9 (Két khóa thời gian & Gas profiling)
├── lab10.md                # Tóm tắt thực hành Lab 10 (Audit mã nguồn AI & sửa 4 lỗi)
├── lab11.md                # Tóm tắt thực hành Lab 11 (Cài quy tắc kinh tế & Test 100%)
├── lab12.md                # Tóm tắt thực hành Lab 12 (Gate Review 1: Duyệt codebase & Thu hẹp phạm vi)
├── lab13.md                # Tóm tắt thực hành Lab 13 (Thực nghiệm tấn công Reentrancy & Hardening)
├── lab14.md                # Tóm tắt thực hành Lab 14 (Rà soát chéo giữa các nhóm & Remediating)
├── lab15.md                # Tóm tắt thực hành Lab 15 (Giao diện Web3 DApp công khai & Kịch bản thuyết trình)
├── docs/
│   ├── AUDIT_REPORT.md     # Báo cáo rà soát chéo 2 chiều (HueLegend audit EcoTrace & Phản hồi bản vá)
│   ├── GATE_REVIEW_1.md    # Tệp quyết định Gate Review 1, 3 việc bắt buộc sửa và tính năng bị cắt
│   ├── PROJECT_PLAN.md     # Kế hoạch dự án v0.4, phân công xoay vai Lab 12–15 và mốc công việc
│   ├── SPEC.md             # Đặc tả 4 quy tắc kiểm thử được (Ai làm gì, khi nào, giới hạn, lỗi)
│   ├── AI_JOURNAL.md       # Nhật ký AI và các phiên làm việc cùng Antigravity AI
│   ├── ECONOMIC_RULES.md   # 4 mục kinh tế: dòng tiền, chống lạm dụng, quản trị, người dùng thiệt
│   └── PRESENTATION_PLAN.md# Kịch bản demo và phân công thuyết trình bảo vệ (Lab 15)
├── contracts/
│   ├── training/           # 4 bài mẫu học kỹ thuật cho Lab 9, 10, 11, 13 (ClassPoint, SafeBank, VulnerableBank...)
│   └── project/
│       └── ProjectCore.sol # Hợp đồng thông minh cốt lõi của HueLegend (Solidity ^0.8.20, CEI, ReentrancyGuard, Đã vá Lab 14)
├── test/
│   ├── ProjectCore.test.js # Bộ kiểm thử tự động (bao gồm ca kiểm thử gian lận TC-03)
│   ├── ClassPoint.test.js  # Kiểm thử bài mẫu ClassPoint OpenZeppelin 5 (feeBps, maxHolding)
│   ├── economic_rules_test.py # Script kiểm thử tự động 7/7 ca kinh tế chuẩn AGENTS.md
│   ├── repo_health_check.js   # Script kiểm tra tự động 5 tiêu chí sức khỏe repo Gate Review 1
│   ├── reentrancy_test.py     # Script thực nghiệm tấn công tái nhập & vá lỗi Lab 13
│   ├── negative_tests.py      # Script kiểm thử 5 nhóm ca thất bại & hardening Lab 13
│   └── audit_remediation_test.py # Script kiểm thử 3/3 bản vá rà soát chéo Lab 14
├── web/
│   ├── index.html          # Giao diện Web3 DApp (Huế Royal Theme, Ethers v6, sinh QR động & Timeline)
│   ├── compact_abi.json    # ABI rút gọn tích hợp trực tiếp vào DApp
│   └── ProjectCore_abi.json# Toàn bộ ABI đầy đủ 70 định nghĩa xuất từ ProjectCore.sol
└── evidence/
    └── lab-08...lab-15/    # Biên bản, ảnh chụp màn hình và TxHash từng lab
```

---

## 🔗 BẢNG ÁNH XẠ NỐI GIAO DIỆN VỚI HỢP ĐỒNG (BƯỚC 1 — LAB 15)

| Thành phần | Giá trị của nhóm HueLegend |
|---|---|
| **Địa chỉ contract** | `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b` (Mạng Ethereum Sepolia Testnet, Chain ID: `11155111`) |
| **ABI lấy từ đâu** | Biên dịch từ `contracts/project/ProjectCore.sol` bằng `solc v0.8.37` (trích xuất tại `HueLegend/web/ProjectCore_abi.json`) |
| **Hàm đọc không tốn phí** | `getBatch(batchCode)`, `getBatchCheckpoints(batchCode)`, `totalBatches()`, `producerStake(addr)`, `producerUnlockTime(addr)`, `hasRole(role, addr)` |
| **Hàm ghi cần xác nhận ví** | `createBatch(batchCode, name, origin, uri)` (payable 0.001 ETH), `addCheckpoint(...)`, `stake()`, `verifyBatch(batchCode)`, `withdrawStake()` |

---

## ⚙️ Hướng dẫn chạy và Kiểm thử

### 1. Trải nghiệm Giao diện Web3 DApp Công Khai (GitHub Pages):
- **Đường dẫn mở trực tiếp trên điện thoại di động:**  
  👉 [https://munniu56.github.io/hce-web3-starter/HueLegend/web/](https://munniu56.github.io/hce-web3-starter/HueLegend/web/)  
- **Đường dẫn đồng bộ gốc:**  
  👉 [https://munniu56.github.io/hce-web3-starter/web/](https://munniu56.github.io/hce-web3-starter/web/)  
- **Mã giao dịch từ DApp:** [`0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01`](https://sepolia.etherscan.io/tx/0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01)

### 2. Biên dịch Hợp đồng qua Remix IDE:
1. Mở [Remix IDE](https://remix.ethereum.org).
2. Tải tệp [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol) lên Remix.
3. Chọn compiler `0.8.20`, chọn Deploy môi trường `Injected Provider - MetaMask` (Mạng Sepolia Testnet).

### 3. Chạy các bộ kiểm thử tự động:
```bash
# Kiểm thử các bản vá rà soát chéo Lab 14 (Hoàn tiền thừa, trần String, reset unlock time):
python HueLegend/test/audit_remediation_test.py

# Thực nghiệm tấn công Reentrancy và vá lỗi (Lab 13):
python HueLegend/test/reentrancy_test.py

# Chạy toàn diện 5 nhóm ca kiểm thử thất bại & Hardening (Lab 13):
python HueLegend/test/negative_tests.py

# Kiểm tra tự động 5 tiêu chí sức khỏe repo Gate Review 1 (Lab 12):
node HueLegend/test/repo_health_check.js

# Chạy bộ kiểm thử quy tắc kinh tế (Lab 11):
python HueLegend/test/economic_rules_test.py
```

---

## 🌐 Thông tin triển khai & Bằng chứng thực nghiệm

- **Mạng:** Ethereum Sepolia Testnet
- **Địa chỉ ví Admin / Deployer:** `0x82d022a704706B2f144863D619D7418F8a0f19A7`
- **Địa chỉ hợp đồng ProjectCore:** `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b`
- **Mã commit nộp bài Lab 8:** `lab-08: khoi tao codebase nhom va dac ta v0.1`
- **Mã commit nộp bài Lab 9:** `lab-09: contract loi bien dich duoc`
- **Mã commit nộp bài Lab 10:** `lab-10: audit va sua loi project core`
- **Mã commit nộp bài Lab 11:** `lab-11: cai quy tac kinh te va test`
- **Mã commit nộp bài Lab 12:** `lab-12: gate review 1 va cap nhat pham vi`
- **Mã commit nộp bài Lab 13:** `lab-13: them negative test va hardening`
- **Mã commit nộp bài Lab 14:** `lab-14: xu ly ket qua audit cheo`
- **Mã commit nộp bài Lab 15:** `lab-15: public dapp va presentation plan`
- **Thẻ phát hành (Tag):** `v0.1-demo`




