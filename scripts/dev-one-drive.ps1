$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local development cache.' }

Write-Host ''
Write-Host 'Starting Snakes & Ladders...' -ForegroundColor Green
Write-Host 'Open http://localhost:5173 in your browser.' -ForegroundColor Yellow
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

Push-Location $CacheRoot
try { node '.\node_modules\vite\bin\vite.js' --host 127.0.0.1 } finally { Pop-Location }
