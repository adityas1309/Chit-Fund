<#
.SYNOPSIS
  Run all contract tests, lint, and format checks locally.
#>
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\contracts")
Write-Host "==> cargo fmt --check"
cargo fmt --all -- --check
Write-Host "==> cargo clippy"
cargo clippy --workspace --all-targets -- -D warnings
Write-Host "==> cargo test"
cargo test --workspace
