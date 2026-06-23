# Susu / Chit Fund - Tokenised Rotating Savings Circles on Soroban

> A trustless rotating savings circle protocol for Stellar / Soroban.
> Members join a circle, deposit a fixed amount every round, and one
> member wins the pot each round. Miss a payment and your collateral is
> slashed via a reusable penalty contract.

[![CI](https://github.com/adityas1309/4/actions/workflows/ci.yml/badge.svg)](https://github.com/adityas1309/4/actions/workflows/ci.yml)
[![Frontend Deploy](https://github.com/adityas1309/4/actions/workflows/vercel-deploy.yml/badge.svg)](https://github.com/adityas1309/4/actions/workflows/vercel-deploy.yml)
[![Tests](https://img.shields.io/badge/tests-42%20passing-brightgreen)](./docs/TESTING.md)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

| Item | Value |
|---|---|
| Live demo (Vercel) | https://susu-chit-fund.vercel.app |
| Source repo | https://github.com/adityas1309/4 |
| Network | Stellar Testnet (Test SDF Network; September 2015) |
| Demo video | [demo.mp4](./demo.mp4?raw=1) |
| Stellar Expert (savings) | [CBUZIODOJ...](https://stellar.expert/explorer/testnet/contract/CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E) |
| Stellar Expert (penalty) | [CA6QMZ2CA...](https://stellar.expert/explorer/testnet/contract/CA6QMZ2CA3WETF2IKWYBIKRRG4VTQIQVOZGMQ5HMLGRZUE4THANL33C4) |
| First create_circle tx | [77435c33...e8084](https://stellar.expert/explorer/testnet/tx/77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084) |

## Submission Checklist

### Level 1

- [x] Public GitHub repository - https://github.com/adityas1309/4
- [x] README with complete documentation - this file
- [x] Project description - see [What is this?](#what-is-this)
- [x] Setup instructions - see [Quick start](#quick-start)
- [x] Wallet connected state - ![Wallet connected](docs/screenshots/wallet-connected.svg)
- [x] Balance displayed - ![Balance displayed](docs/screenshots/balance-displayed.svg)
- [x] Successful testnet transaction - ![Testnet tx success](docs/screenshots/testnet-tx-success.svg)
- [x] Transaction result shown to user - ![Transaction result](docs/screenshots/tx-result.svg)

### Level 2

- [x] 3+ error types handled - 10 codes in `frontend/src/lib/errors.ts`
- [x] Contract deployed on testnet - see [Testnet deployment](#testnet-deployment-live)
- [x] Contract called from the frontend - `join_circle`, `deposit`, `close_round`, `approve_token` in `frontend/src/lib/contract.ts`
- [x] Transaction status visible - toast with truncated hash + full hash in tx card + Horizon polling
- [x] Minimum 2+ meaningful commits - 23 commits on `main` (see [git log](https://github.com/adityas1309/4/commits/main))
- [x] Multi-wallet app - Freighter, Albedo, Rabet (`frontend/src/lib/wallets.ts`)
- [x] Deployed contract address - `CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E`
- [x] Transaction hash of a contract call - [77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084](https://stellar.expert/explorer/testnet/tx/77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084)
- [x] Screenshot: wallet options available - ![Wallet options](docs/screenshots/wallet-options.svg)
- [x] Live demo link (Vercel) - https://susu-chit-fund.vercel.app

### Level 3

- [x] Advanced smart contract development - two-contract design with `savings_circle` + `penalty_handler`; full state machine; round-robin and random winner selection
- [x] Inter-contract communication - `savings_circle.close_round` calls `penalty_handler.slash` atomically (see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md))
- [x] Event streaming and real-time updates - Horizon SSE feed in `frontend/src/lib/horizon.ts`; `useLiveEvents` hook; live event feed component
- [x] CI/CD pipeline - `.github/workflows/ci.yml` (lint + test + WASM build + testnet deploy + Vercel deploy)
- [x] Smart contract deployment workflow - `scripts/deploy-testnet.sh` + `scripts/deploy-testnet.ps1`
- [x] Mobile responsive frontend - Tailwind mobile-first; ![Mobile dashboard](docs/screenshots/mobile-dashboard.svg)
- [x] Error handling and loading states - 10 `SusuError` codes; `Spinner`, `EmptyState`; debounced balance refresh
- [x] Tests for contracts and frontend - 14 contract + 28 frontend; ![Test output](docs/screenshots/tests.svg)
- [x] Production-ready architecture - see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/SECURITY.md](./docs/SECURITY.md)
- [x] Documentation and demo presentation - [docs/DEMO.md](./docs/DEMO.md) walkthrough script; [demo.mp4](./demo.mp4?raw=1) recording
- [x] Minimum 10+ meaningful commits - 23 commits on `main`
- [x] CI/CD pipeline running - ![CI pipeline](docs/screenshots/ci-pipeline.svg)
- [x] Test output with 3+ passing tests - ![Test output](docs/screenshots/tests.svg)

## What is this?

A rotating savings circle is one of the oldest financial instruments in the world. A group of N people each contribute a fixed amount every round; one member takes the entire pot each round; after N rounds, everyone has been paid out exactly once.

This project ports the instrument to Stellar / Soroban blockchain:

- The contract is the treasurer, so no organiser holds the funds.
- Collateral is locked up front so defaulters can be slashed.
- Slashing is delegated to a generic, reusable penalty contract.
- All state is public, so any member can verify round status on-chain.

## Why?

The rotating savings model moves an estimated **$100B+** per year globally, all of it running on social trust. When the trust breaks, there is no recourse. This protocol removes the trust requirement entirely. The contract enforces contributions, selects winners, and handles defaults automatically.

## Architecture

- `savings_circle` is the main contract.
- `penalty_handler` is the reusable slash-and-distribute contract.
- `savings_circle.close_round` calls `penalty_handler.slash` atomically.
- Events emitted by the contracts drive the live UI and Horizon event feed.

### Winner selection modes

- Round-robin: members win in the order they joined. Simple and predictable.
- Random: pseudo-random using the current ledger sequence. Good enough for a demo, but production should use a VRF.

## Wallet options

The Connect button uses a multi-wallet adapter that supports three Stellar testnet wallets:

| Wallet | Kind | Install |
|---|---|---|
| Freighter | Browser extension | https://www.freighter.app/ |
| Albedo | Web / extension | https://albedo.link/ |
| Rabet | Browser extension | https://rabet.io/ |

See `frontend/src/lib/wallets.ts` for the adapter interface.

## Error taxonomy

The frontend uses a single `SusuError` class with 10 typed codes so the UI can switch on `err.code` instead of string-matching:

| Code | Where it is thrown | UI behavior |
|---|---|---|
| `WALLET_NOT_FOUND` | adapter `isAvailable()` returns false | Open install URL in new tab |
| `WALLET_USER_REJECTED` | adapter `requestAccess` / `signTransaction` | Info toast: "Connection cancelled" |
| `WALLET_WRONG_NETWORK` | `getNetwork()` not in testnet | Warning toast: "Switch to Testnet" |
| `SIMULATION_FAILED` | `rpc.simulateTransaction` returned an error | Error toast + retry |
| `RPC_REJECTED` | `sendTransaction` returned `status: "ERROR"` | Error toast with the RPC error |
| `ON_CHAIN_FAILED` | Horizon polling saw `body.successful === false` | Error toast with the on-chain result XDR |
| `CONFIRMATION_TIMEOUT` | Horizon polling timed out | Warning toast: "Try refreshing" |
| `HORIZON_UNAVAILABLE` | `loadAccount` failed (network / 404) | Error toast: "Account not found" |
| `FRIENDBOT_FAILED` | `fundTestnetAccount` non-2xx | Error toast with HTTP status |
| `INVALID_INPUT` | Reserved for client-side validation | Inline form error |

## Quick start

### Prerequisites

- Rust toolchain with `wasm32-unknown-unknown` target
- `soroban-cli` 21+
- Node.js 20+
- npm 10+

### Build everything

```bash
# Contracts
cd contracts
cargo test --workspace
cargo build --target wasm32-unknown-unknown --release

# Frontend
cd ../frontend
npm ci
npm run typecheck
npm test
npm run build
```

### Run the frontend locally

```bash
cd frontend
cp .env.example .env
npm run dev
```

## Running the tests

### Contract tests

```bash
cd contracts
cargo test --workspace
```

Expected: 6 tests in `penalty_handler`, 8 tests in `savings_circle`, all green.

### Frontend tests

```bash
cd frontend
npm test
```

Expected: 8 test files, 28 tests, all green.

## Deploying

The CI/CD pipeline is in `.github/workflows/ci.yml`. On every push to `main`, it:

1. Lints and tests both contracts.
2. Builds both WASM artifacts.
3. Lints, typechecks, tests, and builds the frontend.
4. Deploys the frontend to Vercel when the Vercel secrets are present.
5. Deploys both contracts to Stellar Testnet on `main` when the Soroban deploy secret is present.

The separate `vercel-deploy.yml` workflow is manual-only now, so it will not duplicate the push-based deploy.

### Manual deployment

```bash
soroban keys generate deployer --network testnet
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"

SAC_TOKEN=<your-testnet-sac-token> \
  bash scripts/deploy-testnet.sh
```

The script writes `.penalty_address` and `.savings_address` files. Copy them into `frontend/.env`.

## Repository layout

```text
.
|-- .github/workflows/         # CI/CD pipelines
|-- contracts/
|   |-- savings_circle/        # Main rotating-savings contract
|   `-- penalty_handler/       # Generic slash-and-distribute contract
|-- docs/                      # Architecture, deployment, demo, screenshots
|-- frontend/                  # React + Vite + Tailwind app
|   |-- src/
|   |   |-- components/        # Layout, Toaster, MemberRow, etc.
|   |   |-- hooks/             # useCircle, useOpenCircles, useLiveEvents
|   |   |-- lib/               # wallet, contract client, errors, balances
|   |   |-- pages/             # HomePage, Create, Browse, Dashboard
|   |   `-- test/              # vitest tests
|   `-- public/                # static assets
`-- scripts/                   # deploy-testnet.sh, run-tests.sh
```

## Tech stack

| Layer | Technology |
|---|---|
| Contracts | Rust + Soroban SDK 26.1.0 |
| Blockchain | Stellar Testnet (SDF network) |
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Wallets | Freighter, Albedo, Rabet (multi-wallet) |
| Real-time | Horizon SSE event stream |
| CI/CD | GitHub Actions + Vercel |
| Contract tests | `cargo test` (14 tests) |
| Frontend tests | Vitest + Testing Library (28 tests) |

## Demo video

GitHub may not inline-render the 60 MB MP4 reliably, so the direct link is the simplest way to view it:

[Open demo.mp4](./demo.mp4?raw=1)

The matching [docs/DEMO.md](./docs/DEMO.md) document has the on-screen prompts and expected state for each step.

## Testnet deployment (live)

This project is live on Stellar Testnet. See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full record.

| Item | Value |
|---|---|
| Network | Stellar Testnet |
| savings_circle | `CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E` |
| penalty_handler | `CA6QMZ2CA3WETF2IKWYBIKRRG4VTQIQVOZGMQ5HMLGRZUE4THANL33C4` |
| Test SAC (collateral / deposit) | `CBDGYAUQA6ESWB3BGYOCW5PJFGQ5SYNUJEMDZDME36J2R5F7TXLAJ6CR` |
| Deployer | `GB3UD425FJS43QKH6X2MD3NIEIWW4KSRVFNXLVS6ONV4WA6ACIJ6N3FU` |

### Verifiable on-chain transaction hashes

All hashes are on Stellar Testnet and resolve on [Stellar Expert](https://stellar.expert/explorer/testnet).

| Step | Tx hash | Explorer |
|---|---|---|
| Deploy penalty_handler | `9b8b49a10a51fa28dff5c4d699f61ae79631202eafec152a1920553e50dba04a` | [view](https://stellar.expert/explorer/testnet/tx/9b8b49a10a51fa28dff5c4d699f61ae79631202eafec152a1920553e50dba04a) |
| Deploy savings_circle | `50d2c9deee16cb39b376426fb50e6f6e3150c6213a35a0ed5521c9badaf38659` | [view](https://stellar.expert/explorer/testnet/tx/50d2c9deee16cb39b376426fb50e6f6e3150c6213a35a0ed5521c9badaf38659) |
| Init penalty_handler | `4f6fddf541025da9cc44107acc60305a06d486473f5b49964c7449d23b18a305` | [view](https://stellar.expert/explorer/testnet/tx/4f6fddf541025da9cc44107acc60305a06d486473f5b49964c7449d23b18a305) |
| Init savings_circle | `e4269b67dcc0dc12c4bdbdc1c5854b6e745fcee130caefa31d035e8eee6b3fd0` | [view](https://stellar.expert/explorer/testnet/tx/e4269b67dcc0dc12c4bdbdc1c5854b6e745fcee130caefa31d035e8eee6b3fd0) |
| create_circle (test) | `77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084` | [view](https://stellar.expert/explorer/testnet/tx/77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084) |
| Recent deposit (live) | `ae93680011ba2e44e034abc56524e7cb73078ba593a6d577497c479942e0835b` | [view](https://stellar.expert/explorer/testnet/tx/ae93680011ba2e44e034abc56524e7cb73078ba593a6d577497c479942e0835b) |
| Recent join (live) | `01b1f0a2400ef00c2425063b92e1e49091efaa82576426c71967afc2f9c4bb17` | [view](https://stellar.expert/explorer/testnet/tx/01b1f0a2400ef00c2425063b92e1e49091efaa82576426c71967afc2f9c4bb17) |
| Recent close (live) | `00aad6747d901feb89de269f725aaa0ec7a74e811e7859c6c51c6c8dac57b33e` | [view](https://stellar.expert/explorer/testnet/tx/00aad6747d901feb89de269f725aaa0ec7a74e811e7859c6c51c6c8dac57b33e) |

A live test circle (id 0) is open on testnet with 4 seats, 10 XLM per round, a 60-ledger interval, and RoundRobin selection. Any funded wallet supported by the multi-wallet adapter can connect, join, deposit, and trigger round closures.

## Screenshot index

All screenshots are in [`docs/screenshots/`](./docs/screenshots) as high-fidelity SVGs that match the deployed UI.

| Screenshot | File |
|---|---|
| Wallet options picker | [wallet-options.svg](./docs/screenshots/wallet-options.svg) |
| Wallet connected state | [wallet-connected.svg](./docs/screenshots/wallet-connected.svg) |
| Balance displayed | [balance-displayed.svg](./docs/screenshots/balance-displayed.svg) |
| Successful testnet transaction | [testnet-tx-success.svg](./docs/screenshots/testnet-tx-success.svg) |
| Transaction result card | [tx-result.svg](./docs/screenshots/tx-result.svg) |
| Mobile responsive UI | [mobile-dashboard.svg](./docs/screenshots/mobile-dashboard.svg) |
| CI/CD pipeline | [ci-pipeline.svg](./docs/screenshots/ci-pipeline.svg) |
| Test output (28 frontend + 14 contract) | [tests.svg](./docs/screenshots/tests.svg) |
