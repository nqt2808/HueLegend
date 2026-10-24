# HueLegend – Rà soát và chuẩn hóa giao diện (24/10/2026)

## Giới hạn kiểm tra

Bản này được sửa trên snapshot `HueLegend-Commerce-MVP` được cung cấp trong cuộc trò chuyện. Repository `nqt2808/HueLegend` là Private và chưa đọc được trực tiếp nội dung nhánh `main` trong phiên này. **Không coi đây là một bản diff chắc chắn so với `main` mới nhất**. Không có giao dịch MetaMask thực tế hoặc deploy Vercel/Sepolia nào được thực hiện.

## Đã sửa

- Dùng logo tròn nền trong suốt được cung cấp, tạo hai file web tối ưu và favicon PNG. Giữ nguyên họa tiết rồng – kiến trúc – hoa văn vàng/tím.
- Thay text nhận diện cũ bằng `HueLegend` viết theo kiểu serif cổ điển, `Hue` màu tím sáng và `Legend` nhũ vàng; slogan chính thức ở hai header và footer.
- Tạo CSS nhận diện chung ở `web/assets/brand.css`; không dùng dấu cách letter-spacing lớn gây tràn slogan. Fallback sang Georgia khi không tải được Cormorant Garamond. Font chính xác trong artwork đã render không tồn tại như font văn bản có thể truy xuất, vì vậy đây là mô phỏng gần nhất, không phải phông chữ gốc tuyệt đối.
- Dùng logo chính thức làm minh họa hero gian hàng, không thay bằng icon hoa văn chung.
- Giảm lỗi tràn ngang trên 390px, menu tab có thể cuộn theo chiều ngang, nút MetaMask giữ khả năng thao tác; màu CTA và viền đủ nhất quán.
- Thêm trạng thái `aria-pressed` cho tab quản lý, đổi nhãn tìm kiếm làm rõ chỉ tìm trong trang hiện tại.
- Bổ sung xác nhận thủ công đối chiếu thông tin lô trước khi admin duyệt (chỉ là lớp UI; smart contract vẫn là quyền kiểm duyệt cuối cùng).
- Tách kết quả giao dịch đã xác nhận khỏi lỗi đồng bộ dữ liệu sau giao dịch. Tránh thông báo sai rằng transaction thất bại khi API bị lỗi, và gỡ bước xác nhận đặt hàng trùng lặp.

## Những điểm quan trọng vẫn còn thiếu – ưu tiên trước khi bán thật

1. Hồ sơ doanh nghiệp: frontend đang băm file SHA-256 cục bộ nhưng **không có backend tiếp nhận và lưu file gốc riêng tư**; admin phải nhận file theo kênh khác. Không được quảng cáo đây là duyệt giấy tờ tự động.
2. `HueLegendMarket` mới và `ProjectCore` cũ là hai contract độc lập. **Lô Marketplace chưa được ràng buộc bằng mã lô/transaction với lịch sử QR ProjectCore**, người mua chưa có bằng chứng truy xuất hợp nhất.
3. Sepolia ETH chỉ để test. Chưa có đơn VNĐ, hệ thống địa chỉ nhận hàng/đơn vận chuyển thực tế, cổng thanh toán, đổi trả, phí ship, hóa đơn và chính sách xử lý sự cố.
4. Danh sách lô hiện phân trang theo ID on-chain rồi lọc; khi nhiều sản phẩm chờ duyệt, các trang sẽ thưa. Nên dùng indexer events + PostgreSQL cho sản phẩm có thể tìm kiếm toàn bộ.
5. Thiếu EVM audit, reentrancy/fuzz tests chạy đủ trên toolchain của project, vận hành RPC, rate limit và giám sát.
6. Chưa kiểm thử UX MetaMask trên thiết bị thực, phím tắt/reader toàn hệ thống và các ca giao dịch lỗi dưới tải mạng.

## Cách áp dụng cho GitHub

Ưu tiên giải nén **patch** đè vào repo hiện hành sau khi sao lưu/commit mọi thay đổi. Không thay `.env`, Git history hoặc contract ngoài phạm vi giao diện. Chạy `npm.cmd test` và `npm.cmd run build` sau đó `git diff` trước khi commit. File `.gitignore` hiện có vẫn giữ nguyên.

Nếu muốn thay luôn toàn bộ source bởi ZIP đầy đủ, cần so sánh với nhánh GitHub hiện tại vì trong repo có thể có commit sau snapshot.
