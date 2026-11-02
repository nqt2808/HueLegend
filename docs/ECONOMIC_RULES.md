# ECONOMIC_RULES — QUY TẮC KINH TẾ DỰ ÁN HUELEGEND (v0.1)

Tài liệu này xác lập các quy tắc kinh tế số, cơ chế phân bổ dòng tiền, giới hạn chống lạm dụng, thẩm quyền quản trị và các phương án bảo vệ quyền lợi người tiêu dùng theo chuẩn yêu cầu của **Lab 8**.

---

## 1. Dòng tiền và Quyền lợi (Cash Flow & Rights)

### 1.1. Dòng tiền (Inflows & Outflows)
- **Tiền vào hệ thống (Inflows):**
  - *Phí khởi tạo lô hàng (`batchCreationFee`):* Cơ sở sản xuất nộp `0.001 ETH` (~2-3 USD) cho mỗi lô hàng đặc sản được phát hành lên chuỗi để bù đắp chi phí lưu trữ dữ liệu vĩnh viễn.
  - *Tiền ký quỹ cam kết chất lượng (`producerStake`):* Cơ sở sản xuất nộp khoản tiền cọc `0.05 ETH` khi đăng ký nhận vai trò `ROLE_PRODUCER` nhằm cam kết không khai báo gian dối nguồn gốc nguyên liệu.
- **Tiền ra khỏi hệ thống (Outflows):**
  - *Quỹ phát triển OCOP Huế (`ecosystemFund`):* Thu nhận 100% phí tạo lô để bảo trì hạ tầng node RPC, hỗ trợ làng nghề nghèo số hóa.
  - *Tiền thưởng người tố giác gian lận (`whistleblowerBounty`):* Khi cơ sở bị chứng minh gian lận, 50% tiền cọc (`5.000 bps`) được trích thưởng cho khách hàng hoặc bên tố giác.

### 1.2. Quyền lợi của các bên tham gia
- **Cơ sở sản xuất làng nghề:** Được cấp tem truy xuất Web3 chống làm giả nhãn hiệu, gia tăng giá trị thương hiệu và niềm tin khách hàng; được hoàn trả 100% tiền ký quỹ khi xin rút khỏi hệ thống nếu không có vi phạm.
- **Đơn vị vận chuyển & Cửa hàng bán lẻ:** Được hưởng chứng từ minh bạch bất biến, phân định rõ ràng thời điểm và trách nhiệm bàn giao lô hàng, tránh nguy cơ bồi thường oan khi xảy ra hư hỏng.
- **Khách mua hàng:** Được tra cứu toàn bộ dữ liệu chuỗi cung ứng hoàn toàn miễn phí (0 ETH); có quyền khiếu nại và nhận thưởng khi phát hiện hành vi gian lận nguồn gốc.

---

## 2. Giới hạn chống lạm dụng (Anti-abuse Limits)

Để ngăn chặn các hành vi tấn công từ chối dịch vụ (DoS), spam dữ liệu rác hoặc tạo lô ảo làm nghẽn mạng lưới, hệ thống áp đặt các giới hạn sau:

- **Giới hạn số lượng lô tạo theo thời gian (Rate Limiting):** Mỗi cơ sở sản xuất chỉ được phép tạo tối đa `20 lô hàng/ngày` nhằm ngăn chặn bot spam giao dịch.
- **Thời gian khóa tiền ký quỹ (Stake Lockup Period):** Khoản tiền ký quỹ `producerStake` bị khóa tối thiểu `30 ngày` kể từ khi nộp trước khi được phép gửi yêu cầu rút tiền.
- **Ràng buộc khiếu nại chống tố cáo bừa bãi (Challenging Stake):** Người dùng muốn gửi đơn khiếu nại chính thức kèm yêu cầu xử phạt (slashing) phải đặt cọc một khoản phí bảo đảm `0.01 ETH`. Nếu khiếu nại đúng, người dùng được hoàn cọc và nhận thêm 50% tiền phạt; nếu cố tình vu khống vô căn cứ, khoản cọc này sẽ bị tịch thu sung vào Quỹ OCOP.
- **Giới hạn độ dài chuỗi ký tự:** Mã lô (`batchCode`) từ 5 đến 32 ký tự; tên đặc sản và địa điểm từ 3 đến 128 ký tự để tối ưu chi phí gas lưu trữ.

---

## 3. Quyền quản trị (Governance)

- **Cấp phát và thu hồi quyền vai trò:**
  - Chỉ Ban Quản trị (`ROLE_ADMIN` / `owner`) mới có quyền thực thi các hàm `grantRole` và `revokeRole`.
  - Việc cấp quyền `ROLE_PRODUCER` chỉ được tiến hành sau khi cơ sở hoàn tất nộp tiền ký quỹ vào hợp đồng.
- **Điều chỉnh tham số kinh tế:**
  - Mọi thay đổi về mức phí tạo lô, mức ký quỹ hoặc tỷ lệ phân bổ basis point phải được thực thi qua hàm quản trị `updateEconomicParameters()` và phát sự kiện `EconomicParametersUpdated` công khai on-chain.
  - **Trần giới hạn an toàn (Circuit Breaker):** Phí tạo lô hàng không được vượt quá `0.01 ETH` và tiền ký quỹ không được vượt quá `0.5 ETH` để bảo vệ các hộ kinh doanh làng nghề thủ công nhỏ lẻ.
- **Cơ chế xử phạt vi phạm (Slashing):**
  - Quyết định tịch thu cọc chỉ được kích hoạt khi có sự đồng thuận giữa Ban Quản trị (`ROLE_ADMIN`) và biên bản thẩm định của Cơ quan kiểm tra (`ROLE_INSPECTOR`).

---

## 4. Tình huống người dùng bị thiệt và Cơ chế khắc phục (Loss Scenarios)

### Tình huống 1: Khách hàng mua phải hàng giả dán tem QR sao chép của lô hàng thật
- **Bản chất rủi ro:** Kẻ gian sao chép in lại mã QR của một lô hàng Mè xửng thật rồi dán lên hàng nghìn hộp mè xửng giả.
- **Tác động:** Khách hàng bị lừa mua phải hàng giả dù quét mã QR vẫn thấy dữ liệu on-chain hợp lệ.
- **Khắc phục:** Áp dụng cơ chế **QR kép**: 01 mã QR công khai bên ngoài bao bì để xem thông tin lô, và 01 mã cào phủ bạc dùng 1 lần (Single-use Scratch Code) bên trong hộp. Khi khách cào mã và xác nhận mua trên DApp, mã đó bị vô hiệu hóa; nếu mã đã bị cào trước đó, hệ thống sẽ cảnh báo đỏ "Nguy cơ hàng đã bị nhân bản hoặc tái sử dụng bao bì".

### Tình huống 2: Cơ sở sản xuất bị nghẽn vốn do tiền ký quỹ bị khóa
- **Bản chất rủi ro:** Các hộ sản xuất nhỏ lẻ ở Huế có dòng tiền hẹp, việc đóng 0.05 ETH có thể gây khó khăn lúc đầu vụ thu hoạch.
- **Khắc phục:** Cho phép chính sách hỗ trợ từ Quỹ phát triển làng nghề bảo lãnh ký quỹ cho các cơ sở đạt chuẩn OCOP 4 sao trở lên.

### Tình huống 3: Lô hàng bị hư hỏng trong quá trình vận chuyển nhưng các bên đùn đẩy trách nhiệm
- **Bản chất rủi ro:** Sản phẩm tôm chua bị lên men quá độ do xe lạnh bị tắt máy trên đường vận chuyển.
- **Khắc phục:** Quy định bắt buộc tại chặng bàn giao của bên bán lẻ (`ROLE_RETAILER`): Khi nhận hàng, đại lý phải kiểm tra tình trạng vật lý và chụp ảnh biên bản đính kèm vào `metadataURI`. Nếu bên bán lẻ phát hiện bao bì hỏng trước khi ký nhận, chặng bàn giao sẽ ghi nhận trạng thái lỗi, trách nhiệm thuộc về bên vận chuyển trước đó.
