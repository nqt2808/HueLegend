# HueLegend Fullstack — frontend, backend API, MetaMask va Solidity

**Ban mo rong (2026-10-15):** Da them `api/` (Node/Vercel read-only), `contracts/ProjectCore.sol` (implementation moi), `test/ProjectCore.t.sol` (test EVM), va ket noi backend doc vao frontend. Xem **[HUONG DAN FULLSTACK](docs/FULLSTACK.md)** truoc khi deploy. Hop dong **chua duoc compile/kiem thu on-chain** trong moi truong tao file; khong coi day la audit.

> Phan README frontend phia duoi mo ta version ban dau truoc khi mo rong. Sau khi bo sung, project nay **co backend API chi doc** va **co implementation Solidity moi de deploy**. Khong co PostgreSQL hay dich vu upload file trong goi.

---

# HueLegend — DApp truy xuất nguồn gốc đặc sản Huế

Giao diện tiếng Việt, tím trầm trên nền sáng, dùng HTML/CSS/JavaScript thuần và Ethers.js v6.
Có hai nguồn dữ liệu tách biệt: **trải nghiệm mẫu** và **Ethereum Sepolia**.

**Phạm vi bàn giao:** frontend có các luồng đọc/ghi để kết nối hợp đồng ProjectCore hiện có của nhóm,
bộ mô phỏng để trình diễn, kiểm thử và hướng dẫn triển khai web.
Đây không phải bản triển khai hợp đồng mới và không phải chứng nhận kiểm toán bảo mật.
`contracts/IProjectCore.sol` chỉ là giao diện tham chiếu, không có phần triển khai để deploy.

## 1. Chạy ngay

Cài Node.js 20 trở lên. Giải nén, mở Terminal/PowerShell trong thư mục này:

```bash
npm start
```

Mở **http://localhost:5173**. Không mở `web/index.html` bằng cách nhấp đúp.
Chế độ mẫu và tạo/tải QR hoạt động không cần cài thư viện npm, không cần ví.

Để đóng gói cả thư viện ví và camera về máy, chạy:

```bash
npm install
npm start
```

`postinstall` tự chép thư viện vào `web/vendor`. Khi chưa có thư viện cục bộ,
Ethers và QR Scanner chỉ tải từ CDN khi chọn Sepolia hoặc mở camera.
Môi trường bàn giao chưa chạy thành công bước tải npm; hãy kiểm tra bước này trên máy có Internet.
Sau khi cài thành công, lưu `package-lock.json` vào repo để cố định cả phụ thuộc gián tiếp.

Không dùng Node cũng có thể mở giao diện bằng Python:

```bash
python -m http.server 5173 --directory web
```

Dừng máy chủ bằng `Ctrl+C`.

## 2. Thử giao diện trong khoảng 3 phút

Giữ lựa chọn **Trải nghiệm mẫu** ở góc trên. Bấm một sản phẩm để xem timeline,
mã QR và xuất hồ sơ JSON. Tất cả dữ liệu mẫu được ghi nhãn, không có TxHash giả dẫn sang Etherscan.

Bấm **Kết nối ví** trong chế độ mẫu để chọn vai minh họa **Cơ sở sản xuất**.
Tạo một lô có mã mới, ví dụ `HL-DEMO-2026-007`. Xác nhận trong hộp thoại mô phỏng,
sau đó trang tự mở hồ sơ và QR của lô mới.

Đổi vai sang **Đơn vị vận chuyển** để ghi nhận chặng, rồi **Đơn vị kiểm định** để kiểm định.
Đổi sang **Khách tra cứu** và thử tạo lô: thao tác bị từ chối.
Nút **Đặt lại dữ liệu mẫu** khôi phục sáu hồ sơ minh họa ban đầu.

Trong chế độ mẫu, “kết nối ví” chỉ chọn tài khoản giả lập; không mở MetaMask,
không cần nhập thông tin cá nhân và không gửi ETH.

## 3. Chức năng có trong mã nguồn

| Khu vực | Thao tác |
|---|---|
| Tổng quan | Số lô, số đã kiểm định trong trang hiện tại, phí và mức cọc; lọc/phân trang |
| Tra cứu | Nhập mã, đọc QR từ camera/ảnh, xem timeline, tải QR, xuất JSON |
| Tạo lô | Mã duy nhất, tên sản phẩm, xuất xứ, chứng từ; kiểm tra quyền và cọc |
| Ghi nhận chặng | Chọn vai, địa điểm, nội dung bàn giao, URI hoặc mã băm chứng từ |
| Kiểm định | Xác nhận hoặc thu hồi xác nhận, có ghi chú và lịch sử |
| Ký quỹ | Nạp ETH thử nghiệm, xem cọc/mốc mở khóa, rút khi đủ điều kiện |
| Quản trị | Chủ hợp đồng cấp/thu hồi vai, thay phí, ví quỹ và kỳ khóa |
| Cấu hình | Địa chỉ hợp đồng, RPC công khai; không nhập khóa bí mật |

Người tra cứu Sepolia không cần kết nối ví. Các thao tác ghi mới cần ký trong ví.
Số “đã kiểm định” chỉ tính trên trang đang hiển thị; bộ lọc cũng chỉ lọc trang đó.

## 4. Kết nối hợp đồng thật trên Sepolia

Địa chỉ mặc định lấy từ README được cung cấp:

```text
Chain ID: 11155111
Contract: 0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b
```

Địa chỉ này là cấu hình đầu vào, **chưa được xác minh bytecode trong môi trường bàn giao**.

Mở **Cấu hình kết nối**, kiểm tra địa chỉ và một RPC HTTPS đáng tin cậy.
Chuyển sang **Sepolia Testnet**. Trang kiểm tra chain ID, sự tồn tại mã hợp đồng,
các hàm đọc cốt lõi và hằng vai trò. Nếu lỗi, trang dừng kết nối, không tự đổi sang dữ liệu mẫu.

Bấm **Kết nối ví**. Dùng ví tương thích EIP-1193, chẳng hạn MetaMask; chuyển sang Sepolia khi được yêu cầu.
Chủ hợp đồng cấp vai trong màn hình Quản trị. Ví sản xuất thường cần đủ cọc,
đủ phí tạo lô và ETH thử nghiệm trả gas. Phí, mức cọc và kỳ khóa được đọc từ hợp đồng,
không dùng dữ liệu mẫu làm giá trị Sepolia.

Nguồn ProjectCore đối chiếu khai báo mặc định: phí tạo lô `0.001 ETH`, cọc tối thiểu `0.05 ETH`,
kỳ khóa `30 ngày`, trần phí `0.01 ETH`. Chủ hợp đồng được miễn cọc/phí tạo lô theo mã nguồn đó.
`ROLE_ADMIN` không thay thế quyền `owner()` của các hàm `onlyOwner`.

Sau khi cài thư viện, có thể kiểm tra chỉ-đọc bằng:

```bash
npm run check:live
```

Lệnh này không gửi giao dịch, không cần private key, không xác minh toàn bộ bytecode.

**Quan trọng:** README và mã hợp đồng công khai có một số tên hàm khác nhau.
Bản frontend dùng tên/kiểu đối chiếu từ mã nguồn, không đoán ABI theo README.
Xem [đối chiếu tích hợp](docs/INTEGRATION.md).

## 5. Đưa giao diện lên mạng

```bash
npm install
npm run build
```

Upload **toàn bộ nội dung `dist/`** lên dịch vụ lưu trữ web tĩnh có HTTPS.
Không chỉ upload `index.html`; phải giữ các thư mục `js`, `assets`, `vendor` và file CSS.

Với GitHub Pages: tạo nhánh `gh-pages`, đưa nội dung `dist/` vào thư mục gốc của nhánh đó,
rồi chọn Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)`.
Các đường dẫn tài nguyên là tương đối nên có thể chạy trong đường dẫn con của repo.

QR sử dụng địa chỉ trang hiện tại, kèm mã lô và nguồn dữ liệu.
Hãy mở website **đã công khai**, chọn **Sepolia**, tra cứu lại rồi tải QR để in.
QR chứa `localhost`, tên miền ví dụ hoặc `mode=demo` không phải QR sử dụng thực tế.
QR không tự đổi địa chỉ hợp đồng/RPC khi người khác quét; địa chỉ không khớp sẽ bị cảnh báo.

Camera và tính mã băm cần ngữ cảnh an toàn như HTTPS/localhost.
Khi camera không hoạt động, người dùng vẫn nhập mã lô hoặc chọn ảnh QR được.
Trên điện thoại, phần tra cứu dùng trình duyệt thường; phần ký cần trình duyệt có ví tích hợp.
Phiên bản này chưa tích hợp WalletConnect.

## 6. Kiểm thử

```bash
npm test
```

Kết quả đã chạy: **18/18 ca kiểm thử đơn vị và mô phỏng**, **13/13 kịch bản UI offline**.
Chi tiết và phạm vi xem [báo cáo kiểm thử](docs/TEST_REPORT.md).

Các kết quả đó không phải kiểm thử EVM, không phải giao dịch Sepolia đã xác nhận
và không phải bằng chứng hợp đồng chống được mọi tấn công.
Luồng ký MetaMask, camera vật lý và phụ thuộc tải qua npm/CDN cần được kiểm tra tiếp trên máy thật.

## 7. Cấu trúc cần chỉnh khi phát triển tiếp

```text
web/index.html               Khung trang
web/styles.css               Màu, font, khoảng cách, responsive
web/js/app.js                Điều phối màn hình, biểu mẫu, ví, QR, giao dịch
web/js/views.js              Nội dung và mẫu giao diện tiếng Việt
web/js/config.js             Chain, địa chỉ, RPC, phân trang
web/js/abi.js                ABI đối chiếu ProjectCore
web/js/services/chain.js     Tương tác thật với Ethereum qua Ethers
web/js/services/demo.js      Dữ liệu và luật mô phỏng, không dùng ETH thật
web/js/lib/                  Tiện ích, kiểm tra đầu vào, tải thư viện, QR
contracts/IProjectCore.sol   Chữ ký Solidity tham chiếu, không phải implementation
scripts/                    Máy chủ local, chép thư viện, build, kiểm tra đọc
test/                       Kiểm thử đơn vị và UI
evidence/                   Log đã chạy và ảnh giao diện
docs/                       Tích hợp, kiểm thử, nguồn đối chiếu
docs/reference/              Tài liệu gốc được cung cấp, giữ nguyên nội dung
```

## 8. Giới hạn và lưu ý quan trọng

Không nhập seed phrase, private key hoặc khóa API bí mật vào mã frontend.
Mọi dữ liệu ghi lên blockchain đều phải được coi là công khai.

Nhãn “Đã kiểm định” là trạng thái do vai kiểm định ghi nhận.
Nó không tự chứng minh hàng thật, tiêu chuẩn OCOP hay hiệu lực pháp lý của chứng từ.
QR có thể bị sao chép; hệ thống cần thêm quy trình ngoài đời để gắn mã với sản phẩm.
Mã SHA-256 chỉ giúp so sánh nội dung file, không xác minh người cấp tài liệu.
Trang không tự upload tài liệu; URI phải được chuẩn bị riêng.

Không triển khai nút tịch thu cọc/thưởng tố giác 50% vì hợp đồng đối chiếu chưa có hàm đó.
Không tự bổ sung utility token, oracle, multisig hoặc quy tắc kinh tế mới.

Lịch sử trạng thái lấy từ getter hợp đồng. Phần đối soát TxHash chỉ quét tối đa 5.000 block gần nhất
và được ghi nhãn chưa đầy đủ; sự kiện cũ có thể không tìm thấy.
Không có indexer/server lưu lịch sử riêng.

Nếu giao dịch đang chờ, không gửi lặp. Trang có nút kiểm tra biên nhận và lưu TxHash trong trình duyệt.
Trường hợp ví thay thế/hủy giao dịch rồi đóng trang giữa chừng, hãy kiểm tra cả giao dịch thay thế
trong ví/explorer trước khi thao tác tiếp; xem hướng dẫn chi tiết trong docs/INTEGRATION.md.

Mã mới và tài nguyên gốc của bộ giao diện dùng giấy phép trong [LICENSE](LICENSE).
Thư viện bên thứ ba giữ giấy phép riêng; xem [nguồn và ghi công](docs/SOURCES.md).

## 7. Vercel (ban dong goi bo sung)

`vercel.json` tai thu muc goc thiet lap `npm run build` va xuat thu muc `dist/`.
Xem [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) de deploy truc tiep tu Windows PowerShell.
