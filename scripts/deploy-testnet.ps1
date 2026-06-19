<#
.SYNOPSIS
  Deploy both Susu contracts to Stellar Testnet in the correct order.
.DESCRIPTION
  Equivalent of deploy-testnet.sh, for Windows / PowerShell.
  Requires soroban-cli in PATH and a funded testnet identity.
#>
$ErrorActionPreference = "Stop"

$Network = if ($env:NETWORK) { $env:NETWORK } else { "testnet" }
$SacToken = $env:SAC_TOKEN
if (-not $SacToken) {
  Write-Error "SAC_TOKEN env var is required (testnet SAC token address)."
  exit 1
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ContractsDir = Join-Path $RepoRoot "contracts"
$WasmDir = Join-Path $ContractsDir "target/wasm32v1-none/release"
$PenaltyWasm = Join-Path $WasmDir "penalty_handler.wasm"
$CircleWasm = Join-Path $WasmDir "savings_circle.wasm"

Write-Host "Building WASM artifacts..."
Push-Location $ContractsDir
cargo build --target wasm32v1-none --release -p penalty_handler
cargo build --target wasm32v1-none --release -p savings_circle
Pop-Location

if (-not (Test-Path $PenaltyWasm) -or -not (Test-Path $CircleWasm)) {
  Write-Error "WASM files not found in $WasmDir"
  exit 1
}

Write-Host "Deploying penalty_handler..."
$PenaltyId = soroban contract deploy --wasm $PenaltyWasm --source deployer --network $Network
Write-Host "  -> $PenaltyId"
Set-Content -Path (Join-Path $RepoRoot ".penalty_address") -Value $PenaltyId

Write-Host "Deploying savings_circle..."
$CircleId = soroban contract deploy --wasm $CircleWasm --source deployer --network $Network
Write-Host "  -> $CircleId"
Set-Content -Path (Join-Path $RepoRoot ".savings_address") -Value $CircleId

Write-Host "Initialising penalty_handler with savings_circle as authorised caller..."
soroban contract invoke --id $PenaltyId --source deployer --network $Network -- init --authorized_caller $CircleId

Write-Host "Initialising savings_circle with penalty_handler address..."
soroban contract invoke --id $CircleId --source deployer --network $Network -- init --penalty_contract $PenaltyId

Write-Host ""
Write-Host "Deployment complete."
Write-Host "SAVINGS_CIRCLE_CONTRACT_ID=$CircleId"
Write-Host "PENALTY_HANDLER_CONTRACT_ID=$PenaltyId"
Write-Host ""
Write-Host "Add the following to frontend/.env:"
Write-Host "  VITE_SAVINGS_CIRCLE_CONTRACT_ID=$CircleId"
Write-Host "  VITE_PENALTY_HANDLER_CONTRACT_ID=$PenaltyId"
Write-Host "  VITE_CIRCLE_TOKEN_CONTRACT_ID=$SacToken"
