$ErrorActionPreference = 'Stop'
$CacheRoot = & (Join-Path $PSScriptRoot 'sync-one-drive.ps1')
if (-not $CacheRoot) { throw 'Unable to prepare the local server cache.' }
Push-Location $CacheRoot
try { node '.\server\index.js' } finally { Pop-Location }
