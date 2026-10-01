$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'build-one-drive.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the public server cache.' }
$Existing = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($Existing) {
  Write-Host 'Port 3001 is already in use. Stop the existing multiplayer server, then run npm run public again.' -ForegroundColor Red
  exit 1
}
$ServerProcess = Start-Process -FilePath 'node' -ArgumentList '.\server\index.js' -WorkingDirectory $CacheRoot -WindowStyle Hidden -PassThru
try {
  Start-Sleep -Seconds 1
  Write-Host ''
  Write-Host 'Your temporary public game link will appear below.' -ForegroundColor Green
  Write-Host 'Share the https://...trycloudflare.com address with your friends.' -ForegroundColor Yellow
  Write-Host 'Keep this window open. Press Ctrl+C to stop public access.' -ForegroundColor DarkGray
  Write-Host ''
  & cloudflared tunnel --url 'http://127.0.0.1:3001' --no-autoupdate
} finally {
  if ($ServerProcess -and -not $ServerProcess.HasExited) { Stop-Process -Id $ServerProcess.Id }
}
