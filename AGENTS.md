# AGENTS.md - Quy ước dự án HueLegend (ECO2432)

## 1. Ngôn ngữ và phiên bản

- Solidity `^0.8.20`.
- OpenZeppelin Contracts 5.x; dùng `_update`, không dùng `_beforeTokenTransfer`.
- JavaScript (Ethers.js v6 / Web3.js) & Python 3.10+ cho kịch bản kiểm thử và tương tác dữ liệu on-chain.

## 2. Quy tắc bắt buộc khi viết hợp đồng thông minh (Smart Contract)

1. Mọi hàm làm thay đổi trạng thái phải phát `event`.
2. Mọi hàm dành cho chủ sở hữu hoặc vai trò quản trị phải kiểm tra quyền rõ ràng (`onlyOwner`, `onlyRole`).
3. Áp dụng nghiêm ngặt nguyên tắc **Checks - Effects - Interactions (CEI)** để chống tấn công Reentrancy.
4. Chuyển ETH bằng cú pháp `call{value: ...}("")` và kiểm tra kết quả trả về; tuyệt đối không dùng `transfer` hoặc `send`.
5. Ưu tiên sử dụng `error` tùy biến (`custom errors`) thay cho chuỗi lỗi dài (`require(..., "string")`) để tiết kiệm gas.
6. Tuyệt đối không dùng `tx.origin` để xác thực quyền (chỉ dùng `msg.sender`).
7. Tỷ lệ phần trăm và phí nếu có phải dùng basis point, trong đó 1% = 100 bps.

## 3. Quy tắc khi viết Python / Kịch bản phân tích

1. Không ghi khóa bí mật (Private Key) hoặc API key trong mã nguồn; đọc trực tiếp từ biến môi trường (`.env`).
2. Kiểm tra trạng thái phản hồi trước khi xử lý dữ liệu.
3. Luôn đổi `wei` sang `ETH` trước khi hiển thị ra màn hình hoặc giao diện người dùng.

## 4. Quy ước phản hồi và sinh mã của AI

- **Giải thích ngắn gọn lựa chọn thiết kế** trước khi đưa ra mã nguồn.
- **Hỏi lại khi yêu cầu chưa rõ ràng**; không tự suy đoán quy tắc kinh tế hoặc phân chia vai trò chưa thống nhất.
- Luôn nêu **tối thiểu ba trường hợp kiểm thử**, trong đó bắt buộc phải có ít nhất **một trường hợp gian lận** (như tấn công mạo danh vai trò, chèn chặng giả mạo, hoặc làm sai lệch lịch sử).
- Toàn bộ **chú thích trong mã nguồn phải viết bằng tiếng Việt không dấu**.
