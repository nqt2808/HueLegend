# HueLegend — Hiển thị chức năng theo quyền ví

**Bản cập nhật: 31/10/2026.**

Bản này sửa trực tiếp từ `HueLegend-main.zip` (React 18, TypeScript, Vite 6) người dùng cung cấp. Không ghép lại các bản HTML/JavaScript cũ. Giữ giao diện xanh-vàng, hình nền, logo và các trang hiện có.

## 1. Hành vi đã thay đổi

Khi mở website, kể cả trình duyệt từng cho phép MetaMask trước đó, ứng dụng bắt đầu ở trạng thái khách. Chưa kết nối thì menu máy tính và thanh nhanh điện thoại chỉ có:

- Tổng Quan Hệ Thống.
- Cửa Hàng Đặc Sản.

Không còn nút tạo lô, ghi chặng, niêm yết hay quản trị trên trang chủ của khách. Nút chính trên trang chủ dẫn tới cửa hàng; nút còn lại mở kết nối MetaMask. Nút quản lý niêm yết trong cửa hàng chỉ xuất hiện với người có quyền tương ứng.

Menu Tra Cứu Tem QR xuất hiện sau khi kết nối và xác minh thành công. Đường dẫn hồ sơ/QR từ chi tiết sản phẩm vẫn là dữ liệu đọc công khai: không bắt khách ký giao dịch để xem nguồn gốc.

## 2. Ma trận menu

| Trạng thái/khu vực làm việc | Menu hiển thị |
|---|---|
| Chưa kết nối, đang kiểm tra quyền, sai mạng hoặc xác minh lỗi | Tổng quan, Cửa hàng |
| Khách hàng/Du khách đã kết nối | Tổng quan, Tra cứu QR, Cửa hàng |
| Cơ sở sản xuất | Ba mục chung và Tạo lô hàng |
| Kiểm định viên | Ba mục chung và Kiểm định OCOP |
| Đơn vị vận chuyển | Ba mục chung và Vận chuyển |
| Đại lý bán lẻ | Ba mục chung và Quản lý niêm yết |
| Quản trị hệ thống (Owner) | Toàn bộ tám mục |

Một ví có nhiều quyền có thể bấm vào thông tin ví → **Đổi Vai Trò Làm Việc** để chọn khu vực khác. Việc chuyển khu vực luôn kiểm tra lại quyền. Owner chọn khu vực Sản xuất vẫn chỉ nhìn thấy menu của khu vực Sản xuất; chọn Quản trị mới mở toàn bộ.

## 3. Quyền lấy ở đâu?

Không có danh sách ví cá nhân gán sẵn. Không lấy quyền từ `localStorage`, dữ liệu cloud sync hoặc tên vai trò vừa bấm.

Sau khi MetaMask cấp quyền truy cập tài khoản, ứng dụng kiểm tra:

1. Tài khoản được ví cung cấp qua `eth_accounts`.
2. Mạng ví phải là Sepolia (`11155111` / `0xaa36a7`).
3. Có bytecode ở địa chỉ hợp đồng cấu hình.
4. `owner()` và `hasRole(account, role)` trên cùng một block đọc.
5. Tài khoản và mạng chưa đổi trong thời gian chờ RPC.

Các mã vai trò được tính bằng `ethers.id('ROLE_PRODUCER')` và các tên tương ứng, khớp `keccak256("ROLE_...")` trong source Solidity gửi kèm.

**Owner không đồng nghĩa mọi ví có `ROLE_ADMIN`.** Trong `contracts/project/ProjectCore.sol`, các hàm cấp quyền, thu hồi quyền và đổi phí dùng `onlyOwner`. Vì vậy khu vực Quản trị yêu cầu ví trùng `owner()` thật. Ví chỉ có cờ `ROLE_ADMIN` mà không phải Owner không được mở các thao tác `onlyOwner`.

Chọn vai trò không có quyền sẽ mở khu vực Khách hàng và hiển thị cảnh báo. RPC lỗi không cấp quyền dự phòng. Địa chỉ smart contract trong `src/constants.ts` được giữ lại; đó không phải ví Admin mặc định.

## 4. Đổi ví, đổi mạng, thu hồi quyền

- `accountsChanged`: khóa chức năng cũ ngay và xác minh tài khoản mới.
- `chainChanged`: khóa nghiệp vụ nếu không phải Sepolia; xác minh lại khi trở về Sepolia.
- `disconnect` hoặc danh sách tài khoản rỗng: trở lại khách.
- Ngắt kết nối trong ứng dụng không tự xóa quyền website đã được cấp trong MetaMask, nhưng ứng dụng không tự đăng nhập lại chỉ vì ví vẫn còn quyền đó.
- Kết quả RPC đến chậm của phiên cũ không được khôi phục quyền sau khi đã đổi ví/ngắt kết nối.
- Tab nội bộ có lớp kiểm tra quyền riêng; không chỉ ẩn nút ở menu.
- Trước khi lấy signer cho thao tác nghiệp vụ, ứng dụng đọc lại quyền và kiểm tra lại tài khoản/mạng. Thao tác bị chặn nếu quyền đã bị thu hồi.
- Chữ ký/giao dịch đã gửi tới blockchain không thể bị hủy chỉ bằng cách ngắt kết nối giao diện.

## 5. Các điều chỉnh liên quan

- Sửa ABI gọi `grantRole(address account, bytes32 role)` và `revokeRole(address account, bytes32 role)` cho khớp source Solidity gửi kèm.
- Cấp/thu hồi quyền chỉ báo thành công sau khi có receipt thành công và đọc lại quyền phù hợp.
- Bỏ hành vi lấy giao dịch đổi phí thay cho cấp quyền khi cấp quyền lỗi.
- Bỏ cập nhật quyền giả trong localStorage và bỏ tự khôi phục phiên từ tài khoản lưu sẵn.
- Bỏ mô tả “chữ ký EIP-55”: kết nối ở bước này không yêu cầu ký thông điệp đăng nhập.
- Người vận chuyển không được chọn vai trò Producer/Retailer trong biểu mẫu ghi chặng; Owner vẫn có các lựa chọn được hỗ trợ.
- Khi giao dịch rút phí hoặc đổi trạng thái lỗi, không thông báo thành công và không lấy rút cọc làm hành động thay thế.
- Danh sách ví vừa cấp/thu hồi trong Admin là lịch sử của phiên hiện tại, không phải index đầy đủ mọi ví đã được cấp quyền trên blockchain.

### Lưu ý riêng về checkout trong ZIP gốc

Trong source được gửi, luồng xác nhận đơn tạo TxHash ngẫu nhiên ở trình duyệt rồi có thể gọi chức năng ghi chặng của Retailer thay cho người mua. `ProjectCore.sol` đi kèm không có hợp đồng đơn hàng/escrow tương ứng.

Bản sửa này **không tiếp tục báo thanh toán thành công theo cách đó**. Khách vẫn xem sản phẩm, chi tiết và giỏ hàng; khi xác nhận thanh toán, ứng dụng báo chức năng thanh toán chưa được tích hợp. Không tạo đơn thành công giả, không ghi thông tin địa chỉ/số điện thoại khách thành chặng Retailer.

Đây không phải bản bổ sung hợp đồng thanh toán hay backend đơn hàng mới.

## 6. Chạy trên Windows

Giải nén bản full vào thư mục mới để không ghi đè repository đang rebase hoặc đang có thay đổi chưa lưu. `package.json` nằm ngay gốc ZIP, không có lớp `HueLegend-main` lồng thêm.

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\HueLegend-Role-Menu-Full.zip" -DestinationPath "$env:USERPROFILE\Downloads\HueLegend-Role-Menu"
cd "$env:USERPROFILE\Downloads\HueLegend-Role-Menu"
npm.cmd install
```

Chạy từng lệnh sau; chỉ tiếp tục khi lệnh trước thành công:

```powershell
npm.cmd test
npm.cmd run check:source
npm.cmd run build
npm.cmd run dev
```

Mở địa chỉ Vite báo trong terminal, mặc định cổng 3000. Nếu bản cũ đang chiếm cổng này thì dừng nó bằng Ctrl+C trước.

Có thể xem bản đã build ở cổng riêng:

```powershell
npx.cmd vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Bản này bổ sung script `test`; vẫn dùng `dev`, `build`, `preview` của bản Vite, không dùng `npm start` của các bản HueLegend cũ.

## 7. Kết quả kiểm tra trong phiên đóng gói

| Kiểm tra | Kết quả/phạm vi |
|---|---|
| `npm test` | 54/54 đạt: ma trận menu, controller ví mô phỏng, cây component từ TSX thực tế với React/icon giả lập, kiểm tra liên kết source. |
| `npm run check:source` | 25 tệp TS/TSX không có lỗi cú pháp hoặc dấu conflict. |
| TypeScript strict cho `src/lib/access.ts` và `src/lib/walletSession.ts` | Đạt, dùng TypeScript 5.8.3. |
| Kiểm tra liên kết kiểu nội bộ với khai báo thư viện giả lập | Không ghi nhận lỗi; không thay thế type-check với dependencies thật. |
| `npm install` và build Vite toàn dự án | Chưa xác nhận: môi trường đóng gói không phân giải được `registry.npmjs.org`, không cài được dependencies. |
| React 18 trong trình duyệt, MetaMask thật, RPC thật, giao dịch EVM | Chưa nghiệm thu trong phiên này. |

Không cộng các kiểm tra này thành “đã kiểm toán bảo mật”. Không có deployment mới lên GitHub, Vercel hoặc Sepolia.

Bằng chứng: `evidence/role-navigation/tests.txt`, `source-check.txt`, `scope.md`.

## 8. Tình huống cần nghiệm thu bằng ví thật

**Ca hợp lệ:** Owner cấp ROLE_PRODUCER cho một ví thử nghiệm; ví đó chọn Cơ sở sản xuất và chỉ thấy Tạo lô cùng các mục chung. Lặp lại với kiểm định, vận chuyển và đại lý.

**Ca vi phạm:** đổi sang mạng khác hoặc thu hồi quyền rồi đồng bộ; menu nghiệp vụ phải biến mất. Không hiển thị lại quyền cũ khi tải lại trang.

**Ca gian lận:** ví khách chọn Admin/Inspector, sửa `hl_user_role` hoặc `hl_granted_wallets` trong localStorage, thử mở tab riêng; không được cấp quyền. Hợp đồng vẫn phải chặn người gọi không được phép nếu gọi giao dịch trực tiếp ngoài website.

**Ca đổi phiên:** đang mở Admin, chuyển tài khoản MetaMask sang ví thường; Admin phải đóng ngay, không giữ biểu mẫu/số dư của ví cũ.

**Ca public:** chưa kết nối chỉ có hai menu; liên kết hồ sơ/QR từ sản phẩm vẫn đọc được, không mở bất kỳ nghiệp vụ ghi blockchain nào.

## 9. Phạm vi và giới hạn

Không sửa mã Solidity hay quy tắc kinh tế trong hợp đồng. Không khẳng định bytecode tại địa chỉ Sepolia đang cấu hình khớp source ZIP. Các endpoint backend, lưu trữ chứng từ, quy trình chứng nhận pháp lý, luồng trả phí tạo lô/niêm yết và chức năng khác ngoài phân quyền cần kiểm thử riêng; không coi chúng đã được nghiệm thu chỉ vì menu đã đúng.

Không dùng `git push --force` để bỏ qua xung đột. Bản patch đi kèm được tạo theo đúng ZIP gốc này; chỉ áp dụng sau `git apply --check`. Giữ `.git`, `.env` và cấu hình riêng khi đưa vào repository hiện tại.
