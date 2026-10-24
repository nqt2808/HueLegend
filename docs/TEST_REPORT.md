# Báo cáo kiểm thử bản giao diện HueLegend

Ngày thực hiện: 13/10/2026. Các số liệu dưới đây lấy từ log chạy trong gói bàn giao,
không sao chép kết quả đánh dấu hoàn thành trong tài liệu Lab của nhóm.

## Kết quả

| Nhóm | Đã chạy | Kết quả | Phạm vi |
|---|---:|---|---|
| Node.js test runner | 18 ca | 18 PASS | Tiện ích, quy tắc mô phỏng và đối chiếu chữ ký ABI |
| Chromium/Playwright UI offline | 13 kịch bản | 13 PASS | Giao diện, biểu mẫu, luồng mẫu, QR, desktop/mobile |
| Giao dịch trên EVM/Sepolia | Chưa chạy | Chưa kết luận | Không có ví ký/giao dịch thật trong môi trường |
| Cài thư viện npm và camera vật lý | Chưa xác nhận | Chưa kết luận | Cần máy có Internet và thiết bị thực |

Các nhóm quan trọng trong unit test: BigInt/ETH không dùng số thực để tính tiền;
UTF-8 byte limit; escape HTML; link không an toàn; cấu trúc QR; tạo mã duy nhất;
thiếu phí; mạo danh tạo lô/ghi chặng/kiểm định; cọc chưa đến hạn; quyền owner khác ADMIN;
trần phí; đổi ngữ cảnh; lịch sử kiểm định/thu hồi; lỗi tiếng Việt.

## Các ca tiêu biểu

| Kịch bản | Kỳ vọng | Kết quả ở lớp đã kiểm thử |
|---|---|---|
| Producer đủ cọc/phí tạo mã mới | Tạo một lô, một chặng đầu và QR | PASS trong mô phỏng/UI |
| Tạo lại cùng mã | Báo `BatchAlreadyExists`, không tăng số lô | PASS trong mô phỏng/UI |
| Ví khách mạo danh producer | Báo thiếu vai, không tạo lô | PASS trong mô phỏng/UI |
| Nộp thiếu phí | Báo `InsufficientBatchFee` | PASS trong mô phỏng |
| Rút cọc trước hạn | Báo `StillLocked`/khóa nút rút | PASS trong mô phỏng/UI |
| Rút khi đã đến hạn | Xóa cọc và mốc khóa, trả số dư mẫu | PASS trong mô phỏng |
| Đặt phí >0.01 ETH | Báo vượt trần | PASS trong mô phỏng/UI |
| Nhập tên chứa HTML có mã thực thi | Hiển thị như văn bản, không thực thi | PASS trong UI |
| Màn hình 390 px | Menu hoạt động, không tràn ngang toàn trang | PASS trong UI |
| Tải QR và JSON | Có mã QR, JSON ghi rõ dữ liệu mẫu | PASS trong UI |

**Không được suy diễn:** một test mô phỏng chặn mạo danh không chứng minh Solidity thật chặn mạo danh.
Không có test reentrancy EVM trong bộ code frontend này.

## Cách chạy lại

```bash
npm test
```

UI trên máy có trình duyệt bình thường:

```bash
python -m pip install playwright
python -m playwright install chromium
npm start
```

Giữ server chạy, mở Terminal khác:

```bash
python test/browser-smoke.py
```

Có thể đặt `BROWSER_EXECUTABLE` trỏ đến Chromium đã cài.
Script chạy mặc định ở `http://127.0.0.1:5173`, ghi log/ảnh mới vào `evidence/`.

## Cách UI đã được kiểm tra trong môi trường bàn giao

Chính sách trình duyệt của môi trường không cho điều hướng trang, kể cả localhost.
Không thay đổi hoặc vô hiệu hóa chính sách đó.
Đã nạp HTML/CSS cùng một bundle phục vụ QA vào trang trống qua Playwright `set_content`,
dùng dữ liệu mẫu và thực hiện các tương tác trên DOM thật của Chromium.
`test/bundle-for-qa.mjs` là công cụ phụ thuộc TypeScript cài sẵn trong môi trường QA,
không phải bước build bắt buộc của ứng dụng và không cần để chạy test bình thường ở trên.

Bởi vậy, ảnh chứng minh render và các tương tác offline đã kiểm tra,
không chứng minh native ESM tải thành công qua website công khai, ví MetaMask,
RPC Sepolia, worker camera hay đường truyền CDN.
Server local được kiểm tra riêng bằng HTTP; không đánh đồng kiểm tra server với kiểm tra ký ví.

Ảnh tạo trong QA có QR trỏ đến tên miền thử nghiệm `huelegend.example` và `mode=demo`.
Đây không phải địa chỉ deployment. Không in QR từ ảnh bằng chứng để dùng thật.

## Các tệp bằng chứng

`unit-tests.txt`: log Node 18 ca.
`browser-run.txt` và `browser-tests.json`: log 13 kịch bản UI.
`desktop-dashboard.png`, `desktop-trace.png`, `desktop-checkpoint.png`: ảnh desktop.
`mobile-dashboard.png`, `mobile-trace.png`: ảnh viewport 390 px.
`qr-download.png`, `sample-export.json`: đầu ra thử tải file.
`qr-check.json`: QR tải xuống đã được giải mã độc lập bằng OpenCV; kết quả đúng
`https://huelegend.example/?batch=HL-MEXUNG-2026-001&mode=demo#/trace`.
`build-log.txt`: đã tạo bản web tĩnh `dist/`; log ghi rõ thư viện ví/camera còn dùng CDN.

Các ảnh và dữ liệu minh họa chỉ dùng kiểm tra/trình diễn, không phải chứng nhận sản phẩm.
