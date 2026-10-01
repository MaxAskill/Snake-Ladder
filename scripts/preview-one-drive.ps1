$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local preview cache.' }
Push-Location $CacheRoot
try { node '.\node_modules\vite\bin\vite.js' preview --host 127.0.0.1 } finally { Pop-Location }
