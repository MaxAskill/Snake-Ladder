$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local build cache.' }

Push-Location $CacheRoot
try {
  node '.\node_modules\vite\bin\vite.js' build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }

New-Item -ItemType Directory -Path (Join-Path $ProjectRoot 'dist') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $CacheRoot 'dist\index.html') -Destination (Join-Path $ProjectRoot 'dist\index.html') -Force
Write-Host 'Production build copied to dist\index.html' -ForegroundColor Green
