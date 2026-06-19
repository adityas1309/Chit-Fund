#!/usr/bin/env bash
# Run all Soroban contract tests locally.
set -euo pipefail
cd "$(dirname "$0")/../contracts"
echo "==> cargo fmt --check"
cargo fmt --all -- --check
echo "==> cargo clippy"
cargo clippy --workspace --all-targets -- -D warnings
echo "==> cargo test"
cargo test --workspace
echo "==> cargo build (wasm32v1-none)"
cargo build --target wasm32v1-none --release --workspace
