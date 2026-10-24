# HueLegend Market · Commerce MVP trên Sepolia (24/10/2026)

## 1. Phạm vi và quy tắc nghiệp vụ

**Hai vai trò QUẢN LÝ** trong Marketplace:

1. **Cơ sở bán hàng (seller)**: kết nối MetaMask; gửi hồ sơ (tên/địa chỉ/2 SHA-256 của giấy tờ/hiệu lực); chờ duyệt; nộp lô (mã lô, sản phẩm, mô tả, nơi sản xuất, ảnh URL, giá niêm yết VND + giá thanh toán ETH test, tồn kho); xem đơn; xác nhận đã gửi hàng và cập nhật tồn kho.
2. **Quản trị viên (admin/owner contract)**: kiểm tra giấy tờ bên ngoài blockchain; duyệt/từ chối cơ sở; duyệt/từ chối lô; tạm khóa cơ sở/lô; xử lý tranh chấp đơn hàng.

**Người mua** là khách công khai, không phải vai trò quản trị thứ ba. Xem gian hàng không cần ví; đặt mua THỬ NGHIỆM bằng MetaMask trên Sepolia; theo dõi và xác nhận nhận hàng bằng chính ví đã đặt.

Quy trình: Gửi hồ sơ → Admin kiểm tra giấy tờ gốc → Duyệt cơ sở on-chain → Cơ sở đăng ký lô → Admin duyệt lô on-chain → Lô được công khai khi đồng thời `sellerApproved && lotApproved && giấy tờ còn hạn && stock>0` → Khách test checkout → ETH test giữ trong hợp đồng → Seller đánh dấu giao → Buyer xác nhận và trả seller, hoặc mở tranh chấp để admin quyết định hoàn tiền.

## 2. Kiến trúc mã nguồn

- `contracts/HueLegendMarket.sol`: hợp đồng **mới, độc lập**; không thay thế địa chỉ `ProjectCore.sol` cũ. Hai hợp đồng phải deploy và kiểm thử riêng; mã lô giống nhau không tự chứng minh đã đăng ký trên ProjectCore.
- `web/market.html`, `web/market/*`: giao diện chợ, dashboard seller, admin, đơn hàng. Thư viện ethers.js v6 có sẵn qua `web/js/lib/libraries.js` sau `npm install`.
- `api/market-config.js`: trả cấu hình công khai (địa chỉ Marketplace, chain ID 11155111).
- `api/market-health.js`: xác minh RPC Sepolia, contract có bytecode.
- `api/market-products.js`: đọc lô được duyệt (đã lọc trạng thái seller/stock).
- `api/market-product.js`: chi tiết lô công khai theo id.
- `server/market.js`: logic read-only, chuẩn hóa dữ liệu; **backend không giữ private key**. Mọi thao tác ghi dùng MetaMask từ browser.

### Tách biệt dữ liệu công khai / riêng tư

**Blockchain minh bạch**: tên cơ sở, địa chỉ cơ sở, hash SHA-256 của giấy tờ, ngày hết hạn (nếu có), URL **bản công khai đã che thông tin** khi người bán đồng ý, mã lô, giá thử nghiệm, tồn kho, người phê duyệt và hash giao dịch. Các thông tin này **không thể xóa khỏi blockchain**.

File được chọn trên browser chỉ dùng để tính SHA-256 **không tự upload**. Để kiểm tra giấy tờ gốc, admin phải nhận bản gốc qua kênh an toàn khác và đối chiếu pháp lý thủ công. Không đưa giấy tờ gốc có thông tin cá nhân nhạy cảm lên blockchain hoặc đường link công khai. Cần bổ sung private object storage + xác thực chữ ký + phân quyền xem tài liệu nếu muốn quy trình nộp file trực tiếp trên website.

## 3. Hướng dẫn chạy Windows

Dùng source mới, giải nén vào thư mục project. Chạy tại thư mục có `package.json`:

```powershell
npm.cmd install
npm.cmd run test:market
npm.cmd run build
npm.cmd start
```

Mở `http://127.0.0.1:5173/market.html`. Nếu chưa deploy smart contract, sản phẩm chỉ là **thẻ minh họa DEMO**, không có thanh toán. Không cần đổi các thông số hợp đồng cũ.

## 4. Triển khai Solidity mới bằng Remix + MetaMask

1. Mở https://remix.ethereum.org, tạo file `HueLegendMarket.sol`, dán toàn bộ `contracts/HueLegendMarket.sol` (không cần import package ngoài).
2. Tab Solidity Compiler: chọn `0.8.24` hoặc mới hơn trong nhánh 0.8.x; Compile; kiểm tra lỗi/warnings, test unit nếu có Hardhat.
3. Mở MetaMask, chọn **Ethereum Sepolia** và ví test riêng có Sepolia ETH faucet. Tab Deploy & Run Transactions: chọn `Injected Provider - MetaMask` (hoặc lựa chọn tương đương), deploy `HueLegendMarket` không có constructor args; xác nhận trong ví.
4. Sao chép **địa chỉ hợp đồng** sau khi transaction deploy xác nhận. KIỂM TRA `owner()` trên contract phải trùng ví admin đang dùng.
5. Vercel Project → Settings → Environment Variables: thêm `HUELEGEND_MARKET_ADDRESS = 0x<dia-chi-market-moi>`, thêm `HUELEGEND_RPC_URL` nếu cần RPC riêng (server-side). **Không** nhập private key hoặc seed phrase vào Vercel.
6. Redeploy Vercel hoặc push commit mới. `npm run check:market -- https://ten-app.vercel.app`.
7. Seller test đăng ký hồ sơ và admin dùng ví deploy duyệt. Seller tạo lô, admin duyệt, người mua test checkout Sepolia ETH.

`HUELEGEND_CONTRACT_ADDRESS` vẫn trỏ về ProjectCore cũ, **không thay bằng địa chỉ Marketplace**. Các endpoint `/api/*` cũ vẫn hoạt động độc lập.

## 5. Kiểm thử bắt buộc trước công bố

1. Seller thiếu một trong hai SHA-256: transaction thất bại.
2. Seller chưa được duyệt: không đăng ký lô.
3. Lô chưa được admin duyệt: không xuất hiện ở gian hàng và `placeOrder` revert.
4. Ví khác giả mạo admin duyệt cơ sở hoặc lô: transaction revert.
5. Buyer trả thiếu ETH hoặc số lượng vượt tồn: transaction revert, không giảm kho.
6. Admin khóa seller hoặc giấy tờ hết hạn: lô được ẩn và không thể mua.
7. Buyer hủy trước khi gửi hàng: nhận lại ETH test và hàng trở về kho.
8. Buyer xác nhận đã nhận: seller nhận ETH test. Buyer có thể tranh chấp khi đơn đã đánh dấu gửi, admin xử lý.
9. Nhập URL độc hại hoặc HTML sản phẩm: UI không chạy script; URL tài liệu chỉ chấp nhận https.

Có bài Solidity `test/HueLegendMarket.t.sol`, nhưng **chưa được chạy trên EVM trong môi trường xuất file** do không tải được compiler/dependencies từ npm. Các bài JS tĩnh được chạy nhưng **không thay thế EVM test hoặc audit**.

## 6. Chưa phải thương mại điện tử production

- **Sepolia ETH vô giá trị thanh toán**: bản này là thanh toán thử nghiệm, không nhận tiền VNĐ hoặc đơn hàng thật.
- Chưa có hệ thống lưu **địa chỉ người nhận**, số điện thoại, phí vận chuyển, vận đơn thật, hóa đơn, thanh toán COD/VNPay/MoMo; không đặt dữ liệu cá nhân lên blockchain.
- Chưa có backend upload giấy tờ vào private storage và xác thực chính thức nguồn phát hành; mới có SHA-256 và quy trình kiểm tra thủ công offline.
- `HueLegendMarket` **không kiểm chứng trực tiếp lô ProjectCore**; muốn gắn truy xuất QR bắt buộc thì thêm cơ chế đối chiếu xác minh cùng địa chỉ contract gốc.
- Hợp đồng escrow mới chưa được audit, cần chính sách xử lý tranh chấp và giới hạn thời gian giải ngân minh bạch trước khi dùng giá trị thật.
- Danh sách sản phẩm phân trang **theo số ID rồi lọc**: trang có thể ít hơn 9 mục nếu nhiều lô chưa duyệt. Cần event indexer/DB khi có nhiều sản phẩm.

## 7. Tiếp tục phát triển cho bán hàng thật

Ưu tiên: (1) Kho tài liệu **private** + SIWE nonce/session + admin đọc, (2) dữ liệu sản phẩm/ảnh và shipping address trong PostgreSQL, (3) hệ thống checkout COD hoặc cổng thanh toán VNĐ tuân thủ quy định, (4) kiểm tra hạn giấy tờ/gắn nhãn xác minh, (5) kết nối danh tính lô với ProjectCore và QR, (6) nhật ký trạng thái giao nhận và bảo vệ khách mua, (7) indexer events, (8) vận hành support, chống spam và audit.
