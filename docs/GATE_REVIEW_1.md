# GATE REVIEW 1: DUYỆT CODEBASE VÀ PHẠM VI (LAB 12)

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Tên dự án nhóm:** **HueLegend** — Nền tảng Truy xuất Nguồn gốc Đặc sản Cố đô Huế trên Blockchain
- **Thời gian đánh giá:** Buổi 12 (Tuần 4) — CỔNG DUYỆT BẮT BUỘC
- **Thành viên nhóm:**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023` (Trưởng nhóm)
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Địa chỉ kho lưu trữ (Repo):** [https://github.com/Munniu56/hce-web3-starter](https://github.com/Munniu56/hce-web3-starter)
- **Hợp đồng cốt lõi:** [`contracts/project/ProjectCore.sol`](../contracts/project/ProjectCore.sol)
- **Thông điệp commit chuẩn:**
  ```bash
  lab-12: gate review 1 va cap nhat pham vi
  ```

---

## 🧭 BƯỚC 1 — TỰ KIỂM TRA SỨC KHỎE REPO (15 PHÚT)

Nhóm đã thực hiện kiểm tra tự động và đối soát toàn diện 5/5 tiêu chí sức khỏe codebase trước khi bước vào cổng duyệt Gate Review 1:

| STT | Tiêu chí sức khỏe repo | Trạng thái | Minh chứng đối soát chi tiết |
| :---: | :--- | :---: | :--- |
| **1** | **`README.md` nói rõ bài toán, người dùng và cách chạy** | **[x] ĐẠT** | - **Bài toán:** Nạn hàng nhái, hàng trôi nổi mạo danh đặc sản làng nghề Huế (Mè xửng, Tôm chua, Trà Cung đình, Tinh dầu tràm) làm xói mòn niềm tin du khách.<br>- **Người dùng:** 4 nhóm rõ ràng (Cơ sở sản xuất, Đơn vị vận chuyển, Điểm bán lẻ, Du khách/Người tiêu dùng, Cơ quan kiểm định OCOP).<br>- **Cách chạy:** Hướng dẫn rõ 3 cách (Mở DApp `web/index.html`, biên dịch Remix IDE, chạy test tự động `python HueLegend/test/economic_rules_test.py`). |
| **2** | **`PROJECT_PLAN.md`, `SPEC.md`, `ECONOMIC_RULES.md` còn khớp với mã** | **[x] ĐẠT** | - Đồng bộ 100% các vai trò RBAC: `ROLE_ADMIN`, `ROLE_PRODUCER`, `ROLE_LOGISTICS`, `ROLE_RETAILER`, `ROLE_INSPECTOR`.<br>- Đồng bộ quy tắc kinh tế: `batchCreationFee = 0.001 ETH`, trần Circuit Breaker `0.01 ETH`, tiền cọc `0.05 ETH` khóa 30 ngày.<br>- Đồng bộ hệ thống lỗi tùy biến: `InsufficientBatchFee`, `FeeExceedsLimit`, `UnauthorizedCaller`, `StakeTooLow`, `StillLocked`. |
| **3** | **`ProjectCore.sol` biên dịch được** | **[x] ĐẠT** | - Biên dịch thành công 100% không cảnh báo bằng trình biên dịch `solc v0.8.37` và Remix IDE.<br>- Tuân thủ chuẩn Solidity `^0.8.20`, OpenZeppelin Contracts 5.x, nguyên tắc Checks-Effects-Interactions (CEI). |
| **4** | **Có một ca hợp lệ và một ca gian lận/vi phạm bị chặn** | **[x] ĐẠT** | - **Ca hợp lệ (TC-01):** Tạo lô `HL-MEXUNG-2026-001`, nộp đúng 0.001 ETH, tăng số dư ví Quỹ `ecosystemFund`, phát sự kiện `BatchCreated` và `BatchFeeCollected`.<br>- **Ca vi phạm kinh tế (TC-01b):** Nộp thiếu phí (0.0005 ETH) bị hoàn tác với lỗi `InsufficientBatchFee`.<br>- **Ca vi phạm trần an toàn (TC-01c):** Admin set phí 0.02 ETH (> 0.01 ETH) bị chặn bởi `FeeExceedsLimit`.<br>- **Ca gian lận quyền hạn (TC-03):** Địa chỉ lạ mạo danh bị chặn bởi `UnauthorizedCaller`. |
| **5** | **Lịch sử commit có đóng góp của tất cả thành viên** | **[x] ĐẠT** | - Lịch sử Git ghi nhận đóng góp rõ ràng từ Lab 8 đến Lab 11 của Ngô Thị Thuỷ Vân và Ngô Quỳnh Trang.<br>- Đã thiết lập lộ trình xoay vai chi tiết giữa Lab 8–11 và Lab 12–15 trong `PROJECT_PLAN.md`. |

> **Biên bản kiểm tra tự động:** Xem toàn văn nhật ký kiểm tra sức khỏe tại [`evidence/lab-12/repo_health_check_log.txt`](../evidence/lab-12/repo_health_check_log.txt).

---

## ⏱️ BƯỚC 2 — KỊCH BẢN DEMO 3 PHÚT (45 PHÚT)

Kịch bản phân chia chính xác từng giây để trình bày ngắn gọn, súc tích trước Giảng viên và Hội đồng duyệt:

```
[0:00 - 0:30]             [0:30 - 1:00]             [1:00 - 2:00]             [2:00 - 2:30]             [2:30 - 3:00]
Vấn đề & Người dùng       Quy tắc kinh tế lõi       Demo luồng thành công     Demo ca vi phạm bị chặn   Kế hoạch tiếp theo
(Thuỷ Vân)                (Quỳnh Trang)             (Thuỷ Vân)                (Quỳnh Trang)             (Cả 2 thành viên)
```

### 1. 30 giây đầu (0:00 – 0:30) — Ai gặp vấn đề gì?
- **Người trình bày:** Ngô Thị Thuỷ Vân
- **Nội dung:**  
  *"Kính thưa Giảng viên, các làng nghề đặc sản Huế như Mè xửng Thiên Hương, Tôm chua Trọng Tín đang đối mặt với vấn nạn hàng nhái, hàng kém chất lượng dán nhãn mác giả trôi nổi trên thị trường, làm xói mòn uy tín làng nghề. Trong khi đó, du khách đến Huế mua quà thiếu một công cụ tin cậy để đối soát nguồn gốc thật. Tem giấy truyền thống rất dễ bị bóc tráo. Nhóm xây dựng **HueLegend** trên blockchain Ethereum Sepolia để cung cấp tem truy xuất nguồn gốc bất biến, giúp cơ sở sản xuất bảo vệ thương hiệu và du khách quét mã QR kiểm chứng ngay lập tức."*

### 2. 30 giây tiếp theo (0:30 – 1:00) — Quy tắc kinh tế / quyền lợi quan trọng nhất?
- **Người trình bày:** Ngô Quỳnh Trang
- **Nội dung:**  
  *"Quy tắc kinh tế cốt lõi của HueLegend gồm 3 điểm:  
  Thứ nhất, **Phí khởi tạo lô hàng 0.001 ETH**: Mỗi lô hàng được tạo phải nộp phí để bù đắp chi phí lưu trữ on-chain và tự động chuyển về Quỹ bảo tồn OCOP Huế.  
  Thứ hai, **Ký quỹ cam kết chất lượng 0.05 ETH có khóa thời gian 30 ngày**: Cơ sở sản xuất phải nạp cọc trước khi tạo lô, nếu gian dối sẽ bị tịch thu sung quỹ và trích thưởng 50% cho người tố giác.  
  Thứ ba, **Trần an toàn Circuit Breaker 0.01 ETH**: Quản trị viên không thể tùy tiện tăng phí quá trần, bảo vệ quyền lợi các hộ sản xuất nhỏ lẻ."*

### 3. 60 giây (1:00 – 2:00) — Mở `ProjectCore.sol`, chạy một luồng thành công
- **Người trình bày:** Ngô Thị Thuỷ Vân
- **Thao tác màn hình:** Mở giao diện Remix IDE / kịch bản test và DApp Web3.
- **Nội dung & Hành động:**  
  - Chiếu hàm `createBatch` trong hợp đồng `ProjectCore.sol` giải thích quy trình Checks-Effects-Interactions: kiểm tra cọc $\rightarrow$ kiểm tra phí `msg.value >= batchCreationFee` $\rightarrow$ lưu lô hàng $\rightarrow$ chuyển phí sang ví Quỹ `ecosystemFund` bằng `.call`.
  - Thực thi giao dịch tạo lô mè xửng: `HL-MEXUNG-2026-001` nộp kèm đúng `0.001 ETH`.
  - Kết quả on-chain: Giao dịch thành công, số dư Quỹ tăng chính xác `+0.001 ETH`, phát sự kiện biên lai `BatchFeeCollected` và `BatchCreated`.
  - Mã QR động xuất hiện trên màn hình, quét QR hiển thị thông tin lô hàng on-chain.

### 4. 30 giây (2:00 – 2:30) — Chạy một ca vi phạm và cho xem lỗi bị chặn
- **Người trình bày:** Ngô Quỳnh Trang
- **Thao tác màn hình:** Thực thi ca vi phạm nộp thiếu phí và ca mạo danh vai trò.
- **Nội dung & Hành động:**  
  - Giả lập cơ sở chỉ nộp `0.0005 ETH` (< 0.001 ETH). Giao dịch lập tức bị hoàn tác (revert) với lỗi tùy biến: `InsufficientBatchFee(0.0005 ETH, 0.001 ETH)`.
  - Giả lập ví lạ cố tình gọi `addCheckpoint`: Giao dịch bị chặn với lỗi `UnauthorizedCaller`.
  - Khẳng định: Hợp đồng từ chối mọi giao dịch sai lệch ở bước Checks, tiết kiệm tối đa gas cho người dùng.

### 5. 30 giây cuối (2:30 – 3:00) — Nói việc sẽ hoàn thành tiếp theo
- **Người trình bày:** Cả 2 thành viên
- **Nội dung:**  
  *"Trong các buổi tiếp theo:  
  - **Lab 13:** Nhóm sẽ hoàn thành bộ kiểm thử tấn công gian lận chuyên sâu (tấn công rút cọc trước hạn `StillLocked`, spam chặng quá tải DoS, giả mạo tem OCOP).  
  - **Lab 14:** Tiến hành audit chéo mã nguồn với các nhóm bạn trong lớp.  
  - **Lab 15:** Hoàn thiện URL DApp Web3 công khai, tối ưu giao diện camera quét QR trên điện thoại di động và bảo vệ dự án cuối kỳ."*

---

## ⚖️ BƯỚC 3 — NHẬN QUYẾT ĐỊNH VÀ THU HẸP PHẠM VI (10 PHÚT)

Sau khi rà soát hiện trạng codebase, đối chiếu đặc tả và thảo luận định hướng phát triển, Hội đồng Gate Review 1 đưa ra kết luận:

### 1. Kết luận chính thức:
> **KẾT LUẬN: QUA CÓ ĐIỀU KIỆN (CONDITIONAL PASS) & ĐỒNG THUẬN THU HẸP PHẠM VI**  
> *Lý do:* Codebase đã có cấu trúc chuẩn, hợp đồng lõi `ProjectCore.sol` biên dịch sạch, quy tắc kinh tế phí tạo lô và ký quỹ vận hành chính xác, bộ test 7/7 ca đạt 100%. Tuy nhiên, để đảm bảo chất lượng sản phẩm cuối kỳ chạy thật trên mạng Sepolia, nhóm cần thu hẹp phạm vi theo nguyên tắc: **"Giữ một luồng cốt lõi chạy chắc, không cố giữ nhiều tính năng nửa vời"**.

---

### 2. Ba việc bắt buộc sửa (3 Mandatory Fixes):

1. **Việc 1 — Giữ luồng kiểm định OCOP trực tiếp on-chain, hoãn tích hợp Oracle ngoài chuỗi:**  
   - *Yêu cầu:* Giữ vững quyền kiểm định của cơ quan quản lý nhà nước qua vai trò `ROLE_INSPECTOR` bằng hàm `verifyBatch()` và `revokeBatchVerification()` trực tiếp on-chain. Tạm dừng ý tưởng tích hợp Chainlink Functions / Oracle kết nối API bên ngoài để tránh phụ thuộc vào bên thứ ba và rủi ro hết kinh phí mua LINK token trên mạng thử nghiệm.
2. **Việc 2 — Bổ sung bộ kiểm thử chuyên sâu cho các ca gian lận tinh vi (Chuẩn bị cho Lab 13):**  
   - *Yêu cầu:* Mở rộng kịch bản test tấn công bảo mật: mô phỏng kẻ xấu cố tình gọi `withdrawStake()` khi chưa hết 30 ngày khóa (`StillLocked`), tạo mã lô trùng lặp (`BatchAlreadyExists`), gọi quá 50 chặng (`MaxCheckpointsExceeded`) và mạo danh thanh tra thu hồi tem.
3. **Việc 3 — Tối ưu hóa trải nghiệm quét mã QR trên thiết bị di động (Mobile Web) kết nối Sepolia:**  
   - *Yêu cầu:* Đảm bảo giao diện DApp Web3 (`web/index.html`) tương thích hoàn hảo trên trình duyệt điện thoại (Safari, Chrome Mobile), camera quét trực tiếp mã QR và mở dòng thời gian (Timeline) lô hàng mượt mà mà không bắt buộc người dùng thông thường phải cài đặt ví MetaMask (chỉ đọc dữ liệu qua Public RPC).

---

### 3. Danh sách tính năng bị cắt (Features Cut - Thu hẹp phạm vi):

Nhóm cam kết cắt giảm 3 tính năng phụ trợ không thuộc luồng cốt lõi:

| STT | Tính năng bị cắt | Lý do cắt giảm để bảo vệ luồng cốt lõi |
| :---: | :--- | :--- |
| **1** | **Cắt bỏ phát hành Token tiện ích riêng (ERC-20 Utility Token với phí chuyển nhượng BPS)** | Dù nhóm đã thực hành thành công bài mẫu `ClassPoint.sol` trong Lab 11, việc đưa thêm một token riêng vào sản phẩm thật làm phân tán trải nghiệm người dùng; người mua đặc sản và làng nghề không muốn phải mua thêm token phụ. Hệ thống sử dụng trực tiếp đồng tiền bản địa **Native ETH** cho toàn bộ phí tạo lô và ký quỹ trong `ProjectCore.sol`. |
| **2** | **Cắt bỏ cụm máy chủ IPFS Node tự dựng** | Việc tự dựng IPFS node riêng tốn nhiều tài nguyên và dễ xảy ra sự cố mất kết nối trong buổi demo. Nhóm chuyển sang sử dụng đường dẫn chứng từ số hóa và mã băm SHA-256 lưu trữ trực tiếp trong trường `metadataURI`. |
| **3** | **Cắt bỏ mô hình Quản trị Đa chữ ký (Multi-Sig 2/3) ngoài chuỗi** | Việc tích hợp Safe/MultiSig ngoài chuỗi làm tăng độ phức tạp giao dịch trong các buổi thực hành tiếp theo. Nhóm duy trì mô hình phân quyền **Role-Based Access Control (RBAC)** kết hợp **Trần an toàn Circuit Breaker (`MAX_BATCH_FEE_LIMIT = 0.01 ETH`)** đã được kiểm thử vững chắc. |

---

### 4. Hạn hoàn thành các nội dung sửa đổi:
- **Thời hạn chốt:** Trước buổi **Lab 13 (Tuần 5)**.

---

## 🔄 BƯỚC 4 — CẬP NHẬT KẾ HOẠCH & PHÂN CÔNG XOAY VAI (LAB 13–15)

Căn cứ theo quyết định Gate Review 1 và quy định luân chuyển vai trò của học phần, nhóm chính thức gán trách nhiệm cho giai đoạn Lab 13–15:

### 1. Bảng phân công xoay vai:

| Thành viên | Mã sinh viên | Vai chính Lab 8–11 | Vai chính Lab 12–15 | Nhiệm vụ cụ thể Lab 13–15 |
| :--- | :--- | :--- | :--- | :--- |
| **Ngô Quỳnh Trang** | `23K4300041` | Đặc tả & Giao diện | **Hợp đồng & Kiểm thử** | - **Lab 13 (Lead):** Xây dựng bộ test ca tấn công/gian lận (`test/fraud_attack_test.js`).<br>- **Lab 14:** Thực hiện audit chéo mã nguồn hợp đồng của nhóm bạn.<br>- **Lab 15:** Kiểm thử tích hợp toàn diện E2E và quản lý hợp đồng Sepolia. |
| **Ngô Thị Thuỷ Vân** | `23K4300023` | Hợp đồng & Kiểm thử | **Đặc tả & Giao diện** | - **Lab 13:** Cập nhật `SPEC.md v0.4` sau thu hẹp phạm vi.<br>- **Lab 14:** Hoàn thiện giao diện DApp Web3 mobile-friendly và camera QR.<br>- **Lab 15 (Lead):** Chuẩn bị slide thuyết trình, kịch bản live demo và bảo vệ dự án. |

---

## 📦 SẢN PHẨM NỘP CỦA LAB 12

1. [`docs/GATE_REVIEW_1.md`](./GATE_REVIEW_1.md) — Tệp quyết định Gate Review 1 với kết luận, 3 việc bắt buộc sửa và danh sách tính năng bị cắt.
2. [`docs/PROJECT_PLAN.md`](./PROJECT_PLAN.md) — Kế hoạch dự án đã cập nhật phạm vi sau duyệt và phân công xoay vai Lab 13–15.
3. [`evidence/lab-12/README.md`](../evidence/lab-12/README.md) — Hồ sơ bằng chứng Gate Review 1, kèm biên bản tự kiểm tra sức khỏe repo.
4. [`lab12.md`](../lab12.md) — Tóm tắt thực hành Lab 12 và quy trình cổng duyệt.
5. Mã commit nộp bài trên nhánh `main`:
   ```bash
   lab-12: gate review 1 va cap nhat pham vi
   ```
