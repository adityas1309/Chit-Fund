# Susu / Chit Fund — Tokenised Rotating Savings Circles on Soroban

> A trustless rotating savings circle protocol for Stellar / Soroban.
> Members join a circle, deposit a fixed amount every round, and one
> member wins the pot each round. Miss a payment and your collateral is
> slashed via a reusable penalty contract.

[![CI](https://github.com/example/susu-chit-fund/actions/workflows/ci.yml/badge.svg)](https://github.com/example/susu-chit-fund/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)](./contracts)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)](./frontend)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

## Table of Contents

1. [What is this?](#what-is-this)
2. [Why?](#why)
3. [Architecture](#architecture)
4. [Quick start](#quick-start)
5. [Running the tests](#running-the-tests)
6. [Deploying](#deploying)
7. [Repository layout](#repository-layout)
8. [Tech stack](#tech-stack)
9. [Demo video script](#demo-video-script)
10. [Submission checklist](#submission-checklist)

## What is this?

A rotating savings circle (a Susu in West Africa, a Chit Fund in South
Asia, a Tanda in Latin America, a Hui in East Asia) is one of the
oldest financial instruments in the world. A group of N people each
contribute a fixed amount every round; one member takes the entire pot
each round; after N rounds, everyone has been paid out exactly once.

This project ports the instrument to the Stellar / Soroban blockchain:

* The contract is the treasurer — no organiser holds the funds.
* Collateral is locked up front so defaulters can be slashed.
* Slashing is delegated to a generic, reusable penalty contract.
* All state is public, so any member can verify round status on-chain.

## Why?

The rotating savings model moves an estimated **\$100B+** per year
globally, all of it running on social trust. When the trust breaks
(someone misses a payment, or the organiser disappears with the pot),
there is no recourse. This protocol removes the trust requirement
entirely. The contract enforces contributions, selects winners, and
handles defaults automatically.

## Architecture

```
+-------------------------------+         +-----------------------------+
¦  savings_circle (main)        ¦         ¦  penalty_handler (generic)  ¦
¦                               ¦         ¦                             ¦
¦  • create_circle             ¦         ¦  • slash(defaulter, ...)    ¦
¦  • join_circle               ¦ ------? ¦  • equal-split distribute   ¦
¦  • deposit                   ¦         ¦  • MemberSlashed event      ¦
¦  • close_round ---------------+----+    +-----------------------------+
¦  • get_circle_state          ¦    ¦
¦                               ¦    ¦    Independent of any higher-
¦  Emits:                       ¦    ¦    level protocol; reusable.
¦   CircleCreated               ¦    ¦
¦   MemberJoined                ¦    ¦
¦   DepositReceived             ¦    ¦
¦   RoundClosed                 ¦    ¦
¦   WinnerSelected              ¦    ¦
¦   MemberSlashedLocally        ¦    ¦
¦   CircleCompleted             ¦    ¦
+-------------------------------+    ¦
                                      ¦  Inter-contract: penalty
                                      ¦  handler receives pre-funded
                                      ¦  collateral from the circle
                                      ?  and redistributes it.
                              (SAME TX — atomic)
```

### Winner selection modes

* **Round-robin** — members win in the order they joined. Simple and
  predictable. Good for groups of close friends.
* **Random** — pseudo-random using the current ledger sequence. Good
  enough for a demo. The README explicitly notes on-chain randomness
  limitations; production deployments should use a verifiable random
  function (VRF).

### Inter-contract communication

`savings_circle.close_round` calls `penalty_handler.slash` for each
defaulter before releasing the pot. Penalties are processed atomically
in the same transaction as the round closure.

## Quick start

### Prerequisites

* Rust toolchain with `wasm32-unknown-unknown` target
* `soroban-cli` 21+
* Node.js 20+
* npm 10+

### Build everything

```bash
# Contracts
cd contracts
cargo test --workspace               # 14 tests
cargo build --target wasm32-unknown-unknown --release

# Frontend
cd ../frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

### Run the frontend locally

```bash
cd frontend
cp .env.example .env                 # fill in the contract IDs
npm run dev                          # http://localhost:5173
```

## Running the tests

### Contract tests (14 tests, cargo)

```bash
cd contracts
cargo test --workspace
```

Output:

```
running 6 tests
test test::test_init_stores_authorized_caller ... ok
test test::test_zero_amount_rejected ... ok
test test::test_empty_recipients_rejected ... ok
test test::test_unauthorized_caller_rejected ... ok
test test::test_happy_path_distributes_equally ... ok
test test::test_dust_stays_in_handler ... ok

test result: ok. 6 passed; 0 failed

running 8 tests
test test::test_deposit_recorded_for_correct_member ... ok
test test::test_non_member_cannot_deposit ... ok
test test::test_circle_creation_locks_collateral ... ok
test test::test_round_closes_correctly ... ok
test test::test_already_won_member_cannot_win_again ... ok
test test::test_winner_receives_full_pot ... ok
test test::test_defaulter_is_slashed_and_removed ... ok
test test::test_slashed_collateral_distributed_to_remaining ... ok

test result: ok. 8 passed; 0 failed
```

### Frontend tests (8 tests, vitest)

```bash
cd frontend
npm test
```

Output:

```
 ? src/test/horizon.test.ts          (1 test)
 ? src/test/contract.test.ts         (1 test)
 ? src/test/toast.test.tsx           (1 test)
 ? src/test/wallet.test.tsx          (2 tests)
 ? src/test/components.test.tsx      (3 tests)

 Test Files  5 passed (5)
      Tests  8 passed (8)
```

## Deploying

The CI/CD pipeline is in `.github/workflows/ci.yml`. On every push to
`main`, it:

1. Lints and tests both contracts.
2. Builds both WASM artifacts.
3. Lints, typechecks, tests, and builds the frontend.
4. (On `main` only) deploys both contracts to Stellar Testnet using
   `soroban-cli` and the configured deployer identity.

A separate `vercel-deploy.yml` workflow deploys the frontend to
Vercel on every push to `main`.

### Manual deployment

```bash
# Configure your deployer identity once
soroban keys generate deployer --network testnet
# fund with friendbot
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"

# Deploy
SAC_TOKEN=<your-testnet-sac-token> \
  bash scripts/deploy-testnet.sh
```

The script writes `.penalty_address` and `.savings_address` files.
Copy them into `frontend/.env`:

```
VITE_SAVINGS_CIRCLE_CONTRACT_ID=<from .savings_address>
VITE_PENALTY_HANDLER_CONTRACT_ID=<from .penalty_address>
VITE_CIRCLE_TOKEN_CONTRACT_ID=<SAC_TOKEN>
```

## Repository layout

```
.
+-- .github/workflows/         # CI/CD pipelines
+-- contracts/
¦   +-- savings_circle/        # Main rotating-savings contract
¦   +-- penalty_handler/       # Generic slash-and-distribute contract
+-- docs/                      # Architecture notes, demo scripts
+-- frontend/                  # React + Vite + Tailwind app
¦   +-- src/
¦   ¦   +-- components/        # Layout, Toaster, MemberRow, etc.
¦   ¦   +-- hooks/             # useCircle, useOpenCircles, useLiveEvents
¦   ¦   +-- lib/               # wallet, contract client, horizon SSE
¦   ¦   +-- pages/             # HomePage, Create, Browse, Dashboard
¦   ¦   +-- test/              # vitest tests
¦   +-- public/                # static assets
+-- scripts/                   # deploy-testnet.sh, run-tests.sh
```

## Tech stack

| Layer        | Technology                                 |
|--------------|--------------------------------------------|
| Contracts    | Rust + Soroban SDK 26.1.0                  |
| Blockchain   | Stellar Testnet (SDF network)              |
| Frontend     | React 18 + Vite 5 + TypeScript 5           |
| Styling      | Tailwind CSS 3                             |
| Wallet       | Freighter (via @stellar/freighter-api)     |
| Real-time    | Horizon SSE event stream                   |
| CI/CD        | GitHub Actions + Vercel                    |
| Contract test| `cargo test` (14 tests)                    |
| Frontend test| Vitest + Testing Library (8 tests)         |

## Demo video script (1–2 minutes)

1. **Create a circle.** 4 members, 5 XLM each, 60-ledger round
   interval, round-robin.
2. **Join from 4 test wallets.** Show the "seats taken" indicator
   filling up live.
3. **Each wallet deposits for round 1.** Watch the green ticks appear
   on the member grid as the live event feed updates.
4. **Close round 1.** Advance the ledger past the deadline, hit
   "Close round". Winner selected, pot delivered.
5. **Round 2 with a defaulter.** Three of four wallets deposit. The
   fourth is the defaulter.
6. **Close round 2.** Penalty contract is invoked, defaulter is
   slashed, the remaining three members receive the slash share on
   top of the pot.
7. **Show CI pipeline.** Walk through the green check on the GitHub
   Actions run.

## Submission checklist

- [x] **Public GitHub repository** — `example/susu-chit-fund`
- [x] **README with complete documentation** — this file
- [x] **Minimum 10+ meaningful commits** — see `git log`
- [x] **Live demo link** — see `docs/DEPLOYMENT.md` for the Vercel URL
- [x] **Contract deployment address** — see `docs/DEPLOYMENT.md`
- [x] **Transaction hash for contract interaction** — see `docs/DEPLOYMENT.md`
- [x] **Screenshots** — see `docs/screenshots/`
- [x] **CI/CD pipeline running** — `.github/workflows/ci.yml`
- [x] **3+ passing tests** — 14 contract tests + 8 frontend tests
- [x] **Demo video link** — see `docs/DEPLOYMENT.md`

## License

Apache 2.0. See `LICENSE`.
