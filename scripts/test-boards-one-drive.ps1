$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local board-test cache.' }
New-Item -ItemType Directory -Path (Join-Path $CacheRoot 'scripts') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'test-board-generation.mjs') -Destination (Join-Path $CacheRoot 'scripts\test-board-generation.mjs') -Force
Push-Location $CacheRoot
try {
  node '.\scripts\test-board-generation.mjs'
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
