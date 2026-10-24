# Cập nhật HueLegend từ ZIP trên Windows PowerShell

1. Mở terminal trong `C:\Users\Admin\Downloads\HueLegend` và chạy `git status`. Nếu có thay đổi chưa commit, **hãy commit/stash trước khi ghi đè**.
2. Tải `HueLegend-Brand-Patch.zip` về `Downloads`, chạy:

```powershell
cd "$env:USERPROFILE\Downloads\HueLegend"
git status
Expand-Archive -Path "$env:USERPROFILE\Downloads\HueLegend-Brand-Patch.zip" -DestinationPath . -Force
npm.cmd test
npm.cmd run build
git diff --stat
git diff -- web/index.html web/market.html web/market/app.js
```

3. Khi thay đổi đúng yêu cầu:

```powershell
git add web docs test
git commit -m "feat: align HueLegend identity with official logo and refine marketplace UX"
git push origin main
```

4. Vercel nối GitHub sẽ triển khai thay đổi trên nhánh `main`. Nếu chưa nối, kiểm tra và deploy thủ công từ Vercel CLI (tài khoản cần quyền).

**Không** chạy `git init` hoặc `gh repo create` lại. Không gửi private key MetaMask vào đây.
