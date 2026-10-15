# HueLegend

**Blockchain traceability for traditional Hue specialty products** (Me xung, tom chua, tra cung dinh, tinh dau tram, and local crafts).

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
