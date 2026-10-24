# LAB 15 — GIAO DIỆN WEB VÀ ĐƯA SẢN PHẨM LÊN MẠNG (BUỔI CUỐI PHẦN NỘI DUNG)

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
- **Dự án:** **HueLegend** — Hệ Thống Truy Xuất Nguồn Gốc Đặc Sản Huế Trên Blockchain  
- **Thành viên nhóm:**  
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023` (Lead Lab 15: Đặc tả & Giao diện DApp công khai)  
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041` (Lead Lab 15: Hợp đồng & Kịch bản thuyết trình)  
- **Hợp đồng kết nối:** [`contracts/project/ProjectCore.sol`](./contracts/project/ProjectCore.sol)  
- **Giao diện DApp:** [`web/index.html`](./web/index.html)  
- **Kịch bản thuyết trình:** [`docs/PRESENTATION_PLAN.md`](./docs/PRESENTATION_PLAN.md)  
- **Hồ sơ bằng chứng:** [`evidence/lab-15/README.md`](./evidence/lab-15/README.md)  
- **URL công khai (GitHub Pages):** [https://munniu56.github.io/hce-web3-starter/HueLegend/web/](https://munniu56.github.io/hce-web3-starter/HueLegend/web/)  
- **Thông điệp commit chuẩn:**  
  ```bash
  lab-15: public dapp va presentation plan
  ```
- **Thẻ phát hành (Tag):**  
  ```bash
  v0.1-demo
  ```

---

## 📋 Tóm tắt kết quả thực hiện các bước trong Lab 15 (75 phút)

- [x] **Bước 1 — Nối giao diện với hợp đồng `ProjectCore.sol` (20 phút):**
  - Trích xuất ABI từ `contracts/project/ProjectCore.sol` thành công qua `solc` và nhúng vào biến `CONTRACT_ABI`.
  - Cấu hình địa chỉ hợp đồng `CONTRACT_ADDRESS = "0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b"` trên mạng Sepolia Testnet (Chain ID `11155111`).
  - Ghi nhận bảng ánh xạ chi tiết 4 thành phần (Địa chỉ contract, Nguồn gốc ABI, Hàm đọc miễn phí gas, Hàm ghi có phí) vào `README.md`.
- [x] **Bước 2 — Thử nghiệm toàn bộ luồng cốt lõi và bắt lỗi người dùng (15 phút):**
  - Thao tác thành công: Cơ sở sản xuất gọi `createBatch()` nộp 0.001 ETH tạo lô Mè xửng Thiên Hương `HL-MEXUNG-2026-001` $\to$ Giao diện tự động cấp phát mã QR động và mở hộp tra cứu.
  - Thao tác bị từ chối: Bắt lỗi thông minh qua `try/catch`, chuyển `e.shortMessage` (`UnauthorizedCaller`, `InsufficientBatchFee`, `BatchAlreadyExists`, v.v.) sang ngôn ngữ tiếng Việt thân thiện, không làm người dùng bối rối bởi chuỗi lỗi kỹ thuật.
- [x] **Bước 3 — Đưa lên mạng công khai qua GitHub Pages (15 phút):**
  - Giữ `index.html` trong `web/` và `HueLegend/web/` của chính repository.
  - Công bố đường dẫn trực tuyến truy cập được từ điện thoại di động:
    `https://munniu56.github.io/hce-web3-starter/HueLegend/web/`.
- [x] **Bước 4 — Chỉnh giao diện Web3 DApp theo phong cách Cố Đô (15 phút):**
  - Giữ nguyên toàn bộ logic JavaScript và các thẻ ID tương tác.
  - Thiết kế tông màu tím hoàng gia kết hợp vàng cung đình và hồng hoa sen.
  - Nút bấm có hiệu ứng loading (trạng thái `⏳ Đang gửi giao dịch...`).
  - Thêm cảnh báo tự động phát hiện mạng và chuyển đổi sang Sepolia Testnet.
- [x] **Bước 5 — Lập kịch bản trình bày `docs/PRESENTATION_PLAN.md` (10 phút):**
  - Phân chia thời lượng chuẩn 5 phút (Thuỷ Vân 2:30, Quỳnh Trang 2:30).
  - Mỗi thành viên phụ trách và chỉ dẫn trực tiếp một artifact chuyên trách của mình.
  - Lập bảng câu hỏi phản biện dự kiến cho buổi bảo vệ cuối kỳ.

---

## 📌 Bảng ánh xạ kết nối giao diện - hợp đồng

| Thành phần | Giá trị của nhóm HueLegend |
|---|---|
| **Địa chỉ contract** | `0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b` (Sepolia Testnet, Chain ID: 11155111) |
| **ABI lấy từ đâu** | Biên dịch từ `contracts/project/ProjectCore.sol` (Artifacts ABI) |
| **Hàm đọc không tốn phí** | `getBatch()`, `getBatchCheckpoints()`, `totalBatches()`, `producerStake()`, `producerUnlockTime()` |
| **Hàm ghi cần xác nhận ví** | `createBatch(payable)`, `addCheckpoint()`, `stake()`, `verifyBatch()`, `withdrawStake()` |

---

## 🚀 Lệnh Git nộp bài và gắn Tag:
```bash
git add .
git commit -m "lab-15: public dapp va presentation plan"
git tag -a v0.1-demo -m "Phien ban DApp cong khai v0.1 va kich ban trinh bay Lab 15"
git push origin main --tags
```
