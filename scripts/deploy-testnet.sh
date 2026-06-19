#!/usr/bin/env bash
# Deploy both contracts to Stellar Testnet in the correct order, then
# initialise the savings_circle with the penalty handler address.
#
# Requirements:
#   - soroban-cli >= 21.0.0 in PATH
#   - A funded testnet identity, e.g. `soroban keys generate deployer --network testnet`
#   - A testnet SAC token address to use as the deposit/collateral token
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SAC_TOKEN="${SAC_TOKEN:-}"

echo "Building WASM artifacts..."
( cd "$(dirname "$0")/../contracts" && \
  cargo build --target wasm32v1-none --release -p penalty_handler && \
  cargo build --target wasm32v1-none --release -p savings_circle )

WASM_DIR="$(dirname "$0")/../contracts/target/wasm32v1-none/release"
PENALTY_WASM="$WASM_DIR/penalty_handler.wasm"
CIRCLE_WASM="$WASM_DIR/savings_circle.wasm"

if [[ ! -f "$PENALTY_WASM" || ! -f "$CIRCLE_WASM" ]]; then
  echo "ERROR: WASM files not found in $WASM_DIR" >&2
  exit 1
fi

if [[ -z "$SAC_TOKEN" ]]; then
  echo "ERROR: SAC_TOKEN env var is required (testnet SAC token address)." >&2
  exit 1
fi

echo "Deploying penalty_handler..."
PENALTY_ID=$(soroban contract deploy \
  --wasm "$PENALTY_WASM" \
  --source deployer \
  --network "$NETWORK")
echo "  -> $PENALTY_ID"
echo "$PENALTY_ID" > "$(dirname "$0")/../.penalty_address"

echo "Deploying savings_circle..."
CIRCLE_ID=$(soroban contract deploy \
  --wasm "$CIRCLE_WASM" \
  --source deployer \
  --network "$NETWORK")
echo "  -> $CIRCLE_ID"
echo "$CIRCLE_ID" > "$(dirname "$0")/../.savings_address"

echo "Initialising penalty_handler with savings_circle as authorised caller..."
soroban contract invoke \
  --id "$PENALTY_ID" \
  --source deployer \
  --network "$NETWORK" \
  -- \
  init \
  --authorized_caller "$CIRCLE_ID"

echo "Initialising savings_circle with penalty_handler address..."
soroban contract invoke \
  --id "$CIRCLE_ID" \
  --source deployer \
  --network "$NETWORK" \
  -- \
  init \
  --penalty_contract "$PENALTY_ID"

cat <<EOF

Deployment complete.

SAVINGS_CIRCLE_CONTRACT_ID=$CIRCLE_ID
PENALTY_HANDLER_CONTRACT_ID=$PENALTY_ID

Add the following to frontend/.env:
  VITE_SAVINGS_CIRCLE_CONTRACT_ID=$CIRCLE_ID
  VITE_PENALTY_HANDLER_CONTRACT_ID=$PENALTY_ID
  VITE_CIRCLE_TOKEN_CONTRACT_ID=$SAC_TOKEN
EOF
