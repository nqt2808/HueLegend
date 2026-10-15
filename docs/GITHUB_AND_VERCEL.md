# GitHub HueLegend + Vercel deploy

## Recommended ownership and privacy

Use a new repository named **HueLegend**. Start **private** until security checks and data review pass; change to public later if required for your course. This ZIP contains code only; it does not create a remote GitHub repository.

## Windows prerequisites

- Git for Windows: https://git-scm.com/download/win
- GitHub CLI: https://cli.github.com/ (or winget install --id GitHub.cli)
- Node.js 24.x: https://nodejs.org/

Open PowerShell **in the folder that contains `package.json`** and type only commands, not the `PS C:\...>` prompt.

```powershell
node -v
git --version
gh --version
npm.cmd install
npm.cmd test
npm.cmd run build
```

## Publish as a new repository

```powershell
gh auth login
git init -b main
git add .
git commit -m "Initial HueLegend fullstack MVP"
gh repo create HueLegend --private --source . --remote origin --push
```

For a public repository replace `--private` with `--public` only after ensuring the source contains no credentials and owners agree.

If authentication or identity is missing, configure Git username and email in the local machine. If `HueLegend` already exists under the authenticated account, choose a different name or explicitly configure an existing remote; never overwrite it blindly.

Alternatively, run `./PUBLISH-GITHUB.ps1` from PowerShell after installing Git and GitHub CLI. This script also defaults to private.

## Connect GitHub to Vercel

Vercel Dashboard -> Add New -> Project -> Import `HueLegend` from GitHub. If you already have a deployed Vercel project, open that project's Settings -> Git and connect this new GitHub repository. Avoid accidentally duplicating the production domain.

- Root: `./`
- Framework: `Other`
- Build command: `npm run build`
- Output directory: `dist`
- Backend: Node serverless functions in `api/`
- Optional server environment: `HUELEGEND_RPC_URL`, `HUELEGEND_CONTRACT_ADDRESS`
- Never put any privileged RPC key, private key, or seed phrase in the frontend or GitHub source.

A push to `main` can trigger production deployment after the repository has been connected to Vercel. Pull requests can create preview deployments, depending on Vercel account settings.

GitHub Pages is only for static frontend and will NOT run `api/*.js` Vercel functions.

## Before claiming a live blockchain deployment

Verify the source/ABI/chain against the deployed contract, run Solidity tests, connect MetaMask on Sepolia, and check transactions on the real explorer. The repo creation itself does not deploy a Solidity contract.
