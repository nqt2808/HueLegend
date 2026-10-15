# Nguồn và ghi công

## Tài liệu do người dùng cung cấp

README.md, AGENTS.md, lab08.md đến lab15.md được dùng làm cơ sở yêu cầu.
Bản sao giữ nguyên trong `docs/reference/`.
Các tuyên bố kiểm thử/audit trong tài liệu gốc là nội dung của nguồn,
không tự động trở thành kết quả đã xác minh của bản giao diện mới.

README quyết định định vị HueLegend, nhóm người dùng, luồng tạo lô → chặng → QR
và thông tin deployment cần cấu hình. AGENTS quyết định quy tắc kỹ thuật.
Lab 12 xác định phạm vi rút gọn; Lab 14 mô tả các bản vá; Lab 15 mô tả việc nối frontend.

## Mã nguồn và tài liệu công khai đối chiếu

Đã đọc trong phiên xây dựng ngày 13/10/2026. Các URL nhánh main có thể thay đổi.

- ProjectCore: https://raw.githubusercontent.com/munniu56/hce-web3-starter/main/HueLegend/contracts/project/ProjectCore.sol
- ABI: https://raw.githubusercontent.com/munniu56/hce-web3-starter/main/HueLegend/web/ProjectCore_abi.json
- Ethers v6: https://docs.ethers.org/v6/getting-started/
- MetaMask, quản lý mạng: https://docs.metamask.io/wallet/how-to/manage-networks/
- QR Scanner: https://github.com/nimiq/qr-scanner

Chữ ký trong `web/js/abi.js` và giao diện tham chiếu Solidity được đối chiếu theo ProjectCore,
không phải ABI suy luận từ mô tả README.
Không có xác minh commit SHA/bytecode, xác minh quyền sở hữu ví hoặc kết quả giao dịch công khai mới.

## Thư viện và bản quyền

Ethers.js `6.17.0` và QR Scanner `1.4.2` được ghim phiên bản trong package.json.
`npm install` tải các gói, rồi `scripts/vendor.mjs` chép bản dành cho trình duyệt.
Khi chưa cài, trình tải thư viện sử dụng đúng phiên bản từ jsDelivr.
Muốn giảm phụ thuộc CDN, đóng gói local trước khi công bố website.

Bộ tạo QR local trong `web/vendor/qr-code.js` được đóng gói từ thư mục vendor QRCode của
qrcode-terminal đã có trong môi trường phát triển, nguồn thư viện của Kazuhiko Arase.
Các thông báo bản quyền/giấy phép gốc được giữ trong mã vendor và `QR-LICENSE.txt`.
Nội dung chú thích gốc của bên thứ ba được giữ nguyên; chú thích mới của ứng dụng dùng tiếng Việt không dấu.

Không đóng gói font thương mại hoặc font từ môi trường. Giao diện sử dụng font hệ thống.
Biểu tượng nét và motif trang trí trong bộ code được dựng dưới dạng vector/CSS,
không phải ảnh chứng minh chất lượng hoặc nguồn gốc hàng hóa.

Giấy phép gốc của bộ code mới không thay thế giấy phép của thư viện bên thứ ba,
tài liệu người dùng hoặc ProjectCore của nhóm.
