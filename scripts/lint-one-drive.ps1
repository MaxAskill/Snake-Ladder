$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local lint cache.' }
Push-Location $CacheRoot
try { node '.\node_modules\eslint\bin\eslint.js' . } finally { Pop-Location }
