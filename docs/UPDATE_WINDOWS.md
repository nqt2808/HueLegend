# Dong bo HueLegend tu GitHub ve Desktop Windows

Repository chinh: `https://github.com/nqt2808/HueLegend`, nhanh `main`.
Source React/Vite nam tai thu muc goc; `web/` la website da bien dich bang `npm run build:web`.

## 1. Kiem tra truoc khi keo code

Mo PowerShell va chay:

```powershell
Set-Location "$env:USERPROFILE\Desktop\HueLegend"
git remote -v
git status -sb
git log -1 --oneline
```

Neu `git status -sb` co `M` hoac `??`, hay sao luu nhung tep tu sua. Co the tam luu **ca tep moi** trong git stash (khong bi xoa):

```powershell
git stash push --include-untracked -m "backup-before-HueLegend-update"
git stash list
```

**Luu y:** xem lai `git status` truoc khi stash. Neu co file private khong duoc Git theo doi, hay sao luu rieng. Khong chay `git reset --hard`, `git clean -fd` hoac `git push --force`.

## 2. Dong bo ma nguon

```powershell
git fetch origin
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Git pull that bai; hay gui log truoc khi tiep tuc." }
git status -sb
```

Neu fast-forward khong duoc, dung lai va gui `git status -sb` / log loi. Khong tu dong ep ghi de thay doi local.

## 3. Build website va folder web

```powershell
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "Cai dependencies that bai." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Test that bai." }
npm.cmd run build:web
if ($LASTEXITCODE -ne 0) { throw "Build web that bai." }
npm.cmd run dev
```

- `npm run build:web` tu dong bien dich smart contract, TypeScript, Vite va dong bo `dist/` vao `web/`. File `web/` bi sua thu cong duoc script sao luu vao `web-backups/` truoc khi thay.
- Neu da tung tao stash, **khong** `git stash pop` tu dong: xem `git stash list` va `git stash show --stat` va chi lay lai nhung thay doi muon giu, de tranh dua code cu ve thay code moi.
- `npm run dev` phuc vu ban development o cong 3000. Ket qua localhost khong co nghia GitHub/Vercel da deploy.
- Muon cap nhat website cong khai tren GitHub/Vercel, can commit/push code, sau do kiem tra deployment tren dich vu dang su dung.

Khong dua private key vi, seed phrase hoac `PINATA_JWT` vao terminal chia se hay vao repository.
