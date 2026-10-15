param([switch]$Public)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'package.json')) { throw 'Missing package.json in project root.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git not found. Install Git for Windows: https://git-scm.com/download/win' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI not found. Install via: winget install --id GitHub.cli' }
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login and retry.' }
& gh repo view HueLegend --json name 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw 'HueLegend repository already exists in authenticated account. No files were overwritten.' }
if (-not (Test-Path -LiteralPath '.git')) {
  & git init -b main
  if ($LASTEXITCODE -ne 0) { throw 'git init failed' }
}
& git add .
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  & git commit -m 'Initial HueLegend fullstack MVP'
  if ($LASTEXITCODE -ne 0) { throw 'git commit failed. Configure user.name and user.email.' }
}
$visibility = '--private'
if ($Public) { $visibility = '--public' }
& gh repo create HueLegend $visibility --source . --remote origin --push
if ($LASTEXITCODE -ne 0) { throw 'Repository creation failed. Check CLI output and existing remotes.' }
& gh repo view HueLegend --web
