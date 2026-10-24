# HueLegend

**Blockchain traceability for traditional Hue specialty products** (Me xung, tom chua, tra cung dinh, tinh dau tram, and local crafts).

## 👥 Thành viên thực hiện dự án

1. **Ngô Quỳnh Trang** — MSV: `23K4300041`
2. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023`

> STATUS: EDUCATIONAL FULLSTACK MVP, NOT AUDITED OR VERIFIED FOR REAL FUNDS. The included Solidity contract is a new implementation; it has NOT been confirmed to match the Sepolia contract address recorded in the original course README. Never display demo data as genuine blockchain provenance.

## Features available in this source

- Responsive Vietnamese web UI with muted Hue-inspired colors
- Search/browse product lots, QR trace pages, checkpoints and verification state
- Demo mode separate from live Sepolia mode
- MetaMask wallet connection and role-aware transaction forms
- Read-only Node.js API for Vercel; actual writes are signed by the user's wallet
- `ProjectCore.sol` implementation with producer/logistics/retailer/inspector roles, staking, fees, checkpoints and audit events
- Tests for JavaScript UI / API handling and initial Solidity test cases

## Architecture

```text
Public viewer --> HTTPS Frontend (Vercel) --> Read-only Vercel API --> Sepolia RPC --> ProjectCore
Producer / carrier / inspector --> MetaMask signs transaction -------------> Sepolia --> ProjectCore
```

**GitHub is the source repository. Vercel hosts the frontend and serverless API.** A GitHub repository alone does not deploy the backend or smart contract.

## Quick start (Windows)

Install Node.js 24+ and extract this project into a folder named `HueLegend`.

```powershell
cd "$env:USERPROFILE\Downloads\HueLegend"
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd start
```

Open `http://localhost:5173`. For real read-only API health, use `/api/health`. The endpoint may fail if the RPC, chain ID, or deployed contract is unavailable.

## Cap nhat ngay 15/10/2026 (phases 2-4)

- API `/api/config` cho phep frontend dong bo dia chi contract tu Vercel khi chua co cau hinh thu cong. Khong cong khai URL RPC.
- Web Handler cho Vercel, dong thoi giu ham GET de chay local.
- Dashboard xuat trang hien tai ra CSV, co phan biet data demo/Sepolia va ngan CSV formula injection.
- `npm run check:deployment -- https://your-project.vercel.app` kiem tra 3 endpoint production.
- Da chay 26/26 kiem thu JavaScript; Solidity tests phai chay tren EVM.
- Xem huong dan tung giai doan: [docs/PHASES_2_4.md](docs/PHASES_2_4.md).

## Deploy

- **Create a NEW GitHub repo called HueLegend:** [docs/GITHUB_AND_VERCEL.md](docs/GITHUB_AND_VERCEL.md)
- **Fullstack runbook:** [docs/FULLSTACK.md](docs/FULLSTACK.md)
- **Current GitHub roadmap:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Security status:** [SECURITY.md](SECURITY.md)
- **Vercel-only instructions:** [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)
- **Frontend earlier documentation:** [docs/FRONTEND_README_LEGACY.md](docs/FRONTEND_README_LEGACY.md)

Vercel config at root: `vercel.json` (`npm run build` -> `dist/`; serverless functions in `api/`). On GitHub, `.github/workflows/ci.yml` validates JS tests and build for pushes / PRs. Solidity test automation and bytecode verification are pending; passing CI alone is NOT a contract audit.

## Environment variables

See `.env.example`. The server reads `HUELEGEND_RPC_URL` (HTTPS public read RPC) and `HUELEGEND_CONTRACT_ADDRESS` (deployed Sepolia contract address). Change the frontend configuration accordingly when deploying a different contract. Avoid paid secret RPC URLs in browser-side settings.

## Known limits

- Smart contract implementation not yet EVM-tested in this delivery environment; review and test before deployment.
- A deployed contract's source/ABI/address have not yet been verified against the included new implementation.
- No evidence upload storage, indexed database, SIWE authentication, WalletConnect for external mobile browsers, or enterprise monitoring.
- Any authorized role currently can append checkpoints to an existing batch; there is no per-batch assignment or enforced supply-chain ordering.
- A producer's stake can be withdrawn after the global lock expires even if batches remain in circulation; policy needs review.
- QR labels are copyable: immutable on-chain data does not independently prove physical product authenticity.

## Example negative checks

1. Unauthorized wallet attempts to create a batch -> must revert.
2. Duplicate batch code -> must revert.
3. Unauthorized wallet attempts to verify or append a checkpoint -> must revert.
4. Incorrect chain ID / mismatched contract -> frontend must reject instead of substituting demo data.

## Safety and licensing

Never share your recovery phrase. No backend private key is required for read-only API operations. On-chain metadata is publicly visible. Read [LICENSE](LICENSE) and third-party notices in [docs/SOURCES.md](docs/SOURCES.md).

---

## HueLegend Market · Mới (Sepolia commerce MVP)

Đã bổ sung trang **`/market.html`** gồm gian hàng đặc sản, đăng ký cơ sở có SHA-256 giấy phép kinh doanh + giấy an toàn thực phẩm, duyệt hồ sơ và lô bởi ví admin, giá niêm yết VND và luồng đặt hàng/escrow dùng MetaMask với ETH **thử nghiệm**. Hai vai trò quản trị là **seller** và **admin**; khách hàng chỉ xem/mua thử, không có quyền quản trị.

**Hợp đồng mới độc lập** nằm tại `contracts/HueLegendMarket.sol`. Cần biên dịch, kiểm thử, deploy Sepolia và điền `HUELEGEND_MARKET_ADDRESS` trước khi mở bán thử. Không dùng địa chỉ `ProjectCore` cũ làm địa chỉ Marketplace.

Chi tiết luồng, triển khai, giới hạn pháp lý và dữ liệu riêng tư: [docs/MARKETPLACE.md](docs/MARKETPLACE.md).

- Chạy local: `npm install`, `npm start`, mở `http://localhost:5173/market.html`.
- API: `/api/market-config`, `/api/market-health`, `/api/market-products`, `/api/market-product?id=1`.
- Kiểm tra JS: `npm run test:market`; kiểm tra endpoint công khai: `npm run check:market -- https://ten-site.vercel.app`.

**Chưa thể giao dịch tiền thật**: Sepolia ETH chỉ để demo, chưa có upload private giấy tờ, địa chỉ giao hàng, database đơn hàng hay thanh toán VNĐ. Không cung cấp tài liệu gốc có thông tin nhạy cảm lên URL công khai hoặc blockchain.
