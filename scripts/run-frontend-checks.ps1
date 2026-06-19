<#
.SYNOPSIS
  Run frontend checks: install, typecheck, lint, tests, build.
#>
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\frontend")
Write-Host "==> npm ci"
npm ci
Write-Host "==> typecheck"
npm run typecheck
Write-Host "==> lint"
npm run lint
Write-Host "==> tests"
npm test
Write-Host "==> build"
npm run build
