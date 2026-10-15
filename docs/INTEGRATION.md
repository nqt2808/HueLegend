# Đối chiếu frontend — hợp đồng

## Cơ sở xây dựng và phần chưa được xác nhận

README, AGENTS và Lab 08–15 do người dùng cung cấp là cơ sở yêu cầu.
Những tệp này mô tả cấu trúc, tính năng và các kết quả mà nhóm tự báo cáo,
nhưng không chứa đầy đủ mã Solidity hoặc ABI.

Để nối frontend, đã đọc mã ProjectCore và ABI trong repo công khai mà README dẫn tới.
Các khác biệt dưới đây được giữ tách biệt với nội dung README; không coi README là ABI.
Nguồn chi tiết nằm trong SOURCES.md. Bản đối chiếu được thực hiện ngày 13/10/2026,
không gắn với commit SHA đã xác minh nên nhánh `main` có thể thay đổi về sau.

Chưa đọc và so sánh bytecode của địa chỉ triển khai với bản nguồn đó.
Bước kiểm tra runtime của frontend không thay thế xác minh source/bytecode.

## Bảng ánh xạ quan trọng

| Nội dung README | Chữ ký dùng trong bộ code, theo ProjectCore công khai |
|---|---|
| `stake()` | `depositStake()` — payable |
| `hasRole(role, addr)` | `hasRole(address account, bytes32 role)` |
| `getBatchCheckpoints(batchCode)` | `getCheckpoints(string batchCode)` |
| `totalBatches()` | `getTotalBatches()` |
| `verifyBatch(batchCode)` | `verifyBatch(string batchCode, string inspectorNote, string certificateURI)` |
| `addCheckpoint(...)` | `addCheckpoint(string batchCode, bytes32 role, string location, string action, string metadataURI)` |
| Thưởng tố giác 50%, tịch thu cọc | Không tìm thấy hàm tương ứng trong nguồn đối chiếu; không triển khai UI giao dịch |

Batch gồm: `batchCode`, `productName`, `origin`, `createdAt`, `producer`, `isVerified`, `exists`.
Checkpoint gồm: `timestamp`, `recorder`, `role`, `location`, `action`, `metadataURI`.
ABI không tự thêm trường TxHash vào các struct: TxHash được tra riêng từ event.

## Quyền và kinh tế

Chỉ ví có `ROLE_PRODUCER` hoặc chủ hợp đồng được tạo lô.
Chủ hợp đồng có ngoại lệ cọc và phí theo nguồn đã đọc.
Giao diện đọc lại `owner()`; không dùng `ROLE_ADMIN` để kết luận ví được gọi hàm `onlyOwner`.

Các giá trị thay đổi được như phí, ví quỹ và kỳ khóa được đọc on-chain.
Frontend không tự thay quy tắc staking: nạp thêm khi khoản cọc còn khóa không tự khởi động lại
kỳ khóa theo nguồn đối chiếu; khi đã qua mốc mở khóa, lần nạp mới đặt lại mốc.
Rút cọc lấy toàn bộ phần cọc của người gọi; không cho rút tài khoản khác.

Nguồn có giới hạn 50 chặng trong `addCheckpoint`, nhưng luồng verify/revoke cũng thêm chặng
và không kiểm tra cùng giới hạn trong bản đã đọc. Không được coi toàn bộ lịch sử luôn <=50.
Ngoài ra, `setStakeLockDuration` của nguồn cho phép kỳ khóa 0.
Đây là các điểm nên rà soát ở lớp hợp đồng; frontend không tuyên bố đã vá chúng.
UI quản trị cảnh báo khi chọn kỳ khóa bằng 0.

Không phát triển hợp đồng mới để “lấp chỗ trống” về tịch thu/thưởng tố giác.
Muốn có luồng này cần đặc tả quyền phán quyết, bằng chứng, khiếu nại, thời gian và phân chia quỹ
được nhóm thống nhất, sau đó mới triển khai/test hợp đồng.

## Kiểm tra trước mỗi giao dịch

Frontend giữ ảnh chụp trạng thái ví/ngữ cảnh khi chuẩn bị lời gọi.
Đọc chain/tài khoản ví, dùng `staticCall`, ước lượng gas rồi mở xác nhận.
Ngay trước khi gửi, kiểm tra lại chain/tài khoản và mô phỏng lại.
Các bước này chỉ giảm thao tác lỗi; hợp đồng mới là nơi bắt buộc thực thi quyền và điều kiện.

Giao dịch chỉ được đánh dấu thành công sau receipt có status=1.
Một xác nhận không phải cam kết về tính chung cuộc tuyệt đối.
Khi timeout, trang giữ trạng thái đang chờ, không báo thành công và không khuyến khích gửi lại.

Nếu đã tăng tốc/hủy giao dịch rồi tải lại trang, TxHash cũ có thể không có receipt.
Kiểm tra ví và explorer để xác định giao dịch thay thế, nonce, trạng thái cuối cùng.
Chỉ sau khi chắc chắn giao dịch cũ đã được thay thế/hủy và không còn nguy cơ thực thi lặp,
mới dừng theo dõi bản ghi cũ. Với phiên bản này, có thể xóa bản ghi local bằng DevTools:

```javascript
localStorage.removeItem("huelegend:pending:v1");
location.reload();
```

Lệnh trên chỉ xóa trạng thái trên máy, KHÔNG hủy giao dịch trên blockchain.
Không thực hiện khi giao dịch vẫn có thể được xác nhận.

## Kiểm soát dữ liệu đầu vào

Giới hạn mã lô/tên/xuất xứ tính theo số byte UTF-8, không chỉ số ký tự:
64/128/128 theo nguồn hợp đồng.
Tên/mô tả được escape trước khi chèn vào HTML.
Liên kết chứng từ được giới hạn HTTPS, IPFS hoặc chuỗi SHA-256; không mở `javascript:` hay `data:`.
Chứng từ không tự tải lên máy chủ; kiểm tra băm file diễn ra trong trình duyệt.
Thông tin ngoài chuỗi vẫn phải được kiểm chứng bằng quy trình nghiệp vụ.

Link QR có thể chứa chain/contract để đối chiếu, nhưng không được thay đổi cấu hình đang tin cậy
một cách tự động. Dữ liệu demo và Sepolia có nhãn, khóa lưu và định danh giao dịch riêng.
Thông tin cấu hình và dữ liệu mẫu lưu cục bộ có thể bị người dùng sửa; không phải cơ chế phân quyền.

## Điều kiện nghiệm thu tích hợp thật

Cần xác minh địa chỉ đúng deployment của nhóm, lưu ABI/artifact từ đúng bản biên dịch,
đối chiếu bytecode và chạy lại bộ test hợp đồng trên EVM.

Dùng nhiều ví Sepolia độc lập: owner, producer, logistics, retailer, inspector và ví không quyền.
Thử đọc khi không cài ví; thử sai mạng, từ chối ký, thiếu gas, RPC lỗi và tài khoản thay đổi.
Thử đủ cọc/tạo lô/hoàn phí thừa, ghi chặng, kiểm định, thu hồi, rút cọc sai/đúng thời điểm.
Thử gọi trực tiếp bằng ví không quyền, không chỉ thử nút bị khóa trên giao diện.
Lưu TxHash thật và receipt, không tái sử dụng các chuỗi minh họa trong tài liệu gốc.

Sau đó mới kết luận phạm vi nào đã qua tích hợp. Bộ kiểm thử hiện giao chưa làm các bước này.
