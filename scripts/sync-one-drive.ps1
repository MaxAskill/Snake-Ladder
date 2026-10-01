$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CacheRoot = Join-Path $env:LOCALAPPDATA 'SnakeLadderDevPhase4'

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $CacheRoot 'src') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $CacheRoot 'server') -Force | Out-Null

$RootFiles = @(
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'eslint.config.js',
  'index.html',
  'styles.css',
  'gameEngine.js'
)

foreach ($File in $RootFiles) {
  Copy-Item -LiteralPath (Join-Path $ProjectRoot $File) -Destination (Join-Path $CacheRoot $File) -Force
}

Copy-Item -Path (Join-Path $ProjectRoot 'src\*') -Destination (Join-Path $CacheRoot 'src') -Recurse -Force
Copy-Item -Path (Join-Path $ProjectRoot 'server\*') -Destination (Join-Path $CacheRoot 'server') -Recurse -Force

if (-not (Test-Path -LiteralPath (Join-Path $CacheRoot 'node_modules\vite\bin\vite.js'))) {
  Write-Host 'Installing cached development dependencies...' -ForegroundColor Cyan
  npm ci --prefix $CacheRoot | Out-Host
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (-not (Test-Path -LiteralPath (Join-Path $CacheRoot 'node_modules\socket.io-client\package.json')) -or -not (Test-Path -LiteralPath (Join-Path $CacheRoot 'node_modules\socket.io\package.json'))) {
  Write-Host 'Adding cached multiplayer dependencies...' -ForegroundColor Cyan
  npm install --prefix $CacheRoot --no-audit --no-fund | Out-Host
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$CacheRoot
