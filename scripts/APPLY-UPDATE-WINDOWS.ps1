# Huong dan sau khi giai nen HueLegend-Phases-2-4.zip vao thu muc HueLegend da co .git.
# KHONG TU DONG PUSH: cho nguoi dung kiem tra noi dung, nhat la .env va dia chi contract.
$ErrorActionPreference = "Stop"
if (-not (Test-Path "./.git")) { throw "Khong thay .git. Hay mo PowerShell trong thu muc HueLegend hien co." }
if (Test-Path "./api/_shared.js") { Remove-Item "./api/_shared.js" }
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "npm install that bai" }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "JavaScript tests that bai" }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Build that bai" }
git status --short
Write-Host "Da kiem tra. Hay xem git diff truoc khi commit va push; chua co thao tac deploy." 
