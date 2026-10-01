$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local development cache.' }

$LanAddress = Get-NetIPConfiguration |
  Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.IPv4Address } |
  Select-Object -First 1 -ExpandProperty IPv4Address |
  Select-Object -ExpandProperty IPAddress

Write-Host ''
Write-Host 'Starting Wi-Fi preview...' -ForegroundColor Green
Write-Host "Phone address: http://${LanAddress}:5173" -ForegroundColor Yellow
Write-Host 'Keep this window open and press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

Push-Location $CacheRoot
try { node '.\node_modules\vite\bin\vite.js' --host 0.0.0.0 } finally { Pop-Location }
