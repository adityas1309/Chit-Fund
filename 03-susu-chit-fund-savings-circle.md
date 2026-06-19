# 03 — Tokenised Group Savings Challenge (Susu / Chit Fund)

> **Level 3 | Orange Belt | Stellar / Soroban**
> Status: Culturally novel on blockchain — $100B+ real-world market, untouched on Soroban

---

## Overview

A rotating savings circle — a financial instrument known as Susu in West Africa, Chit Fund in South Asia, Tandas in Latin America, and Hui in East Asia. A group of N people each deposit a fixed XLM amount every round. Each round, one member receives the entire pot. After N rounds, everyone has received the pot exactly once. A penalty contract handles missed deposits by slashing the defaulter's collateral and redistributing to remaining members. No group admin holds funds — the contract is the treasurer.

---

## Problem It Solves

Rotating savings circles move an estimated $100B+ per year globally, running entirely on social trust. When trust breaks down — someone misses a payment, or the organiser disappears with the pot — there is no recourse. This protocol removes the trust requirement entirely. The contract enforces contributions, selects winners, and handles defaults automatically.

---

## Smart Contract Architecture

### `savings_circle.contract` (main)
- `create_circle(members[], deposit_amount, round_interval_ledgers, selection_mode)` — initialises circle, locks member collateral
- `deposit(circle_id)` — member deposits their round contribution
- `close_round(circle_id)` — callable after `round_interval_ledgers`; tallies deposits, selects winner, calls penalty contract for defaulters, releases pot
- `get_circle_state(circle_id)` → `{current_round, next_deadline, pending_winners[], deposits_this_round{}}`
- Emits `DepositReceived`, `RoundClosed`, `WinnerSelected` events

### `penalty_handler.contract` (separate)
- `slash(circle_id, defaulter, collateral_amount, remaining_members[])` — callable only by `savings_circle`
- Splits slashed collateral equally among members who did deposit this round
- Removes defaulter from future rounds
- Emits `MemberSlashed` event

### Winner Selection Modes
- **Round-robin** — members win in order of joining (simple, predictable)
- **Random** — uses `env.ledger().sequence()` as a seed for pseudo-random selection (good enough for a demo; note on-chain randomness limitations in README)

### Inter-Contract Communication
`savings_circle.close_round` calls `penalty_handler.slash` for each defaulter before releasing the pot — penalties are processed atomically in the same round-close transaction.

---

## Key Features

- Collateral locked upfront covers one round of default — economic skin in the game
- Once a member has won the pot, they can still be slashed for future non-payment
- Circle state is fully public — any member can verify the round status on-chain
- Members who complete all N rounds without defaulting receive their collateral back
- Frontend shows a live "seats taken" view as members join

---

## Frontend (Mobile Responsive)

- **Create circle form** — set member count, deposit amount, round interval, selection mode
- **Join circle page** — browse open circles, join with one click (deposits collateral)
- **Circle dashboard** — round progress bar, countdown to next deadline, member list with deposit status (green tick / red X)
- **Deposit button** — one-click deposit for current round with confirmation
- **Live event feed** — deposits, round closures, winner announcements, slashes
- Mobile: member status as avatar row with tick/cross badges, large countdown timer

---

## Testing Plan

| Test | Type | Checks |
|---|---|---|
| Circle creation locks correct collateral per member | Unit | contract balance post-create |
| Deposit recorded for correct member and round | Unit | state check |
| Non-member cannot deposit | Unit | auth error |
| Round closes correctly after interval | Unit | round number increments |
| Winner receives full pot amount | Unit | balance delta |
| Defaulter is slashed and removed | Integration | penalty contract called, balance delta |
| Slashed collateral distributed to remaining members | Integration | each member balance +slashShare |
| Already-won member cannot win again (round-robin) | Unit | skip logic |

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: Stellar Level 3 CI

on: [push, pull_request]

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Rust
        run: rustup target add wasm32-unknown-unknown && cargo install soroban-cli
      - name: Lint
        run: cargo clippy --all -- -D warnings
      - name: Test
        run: cargo test --workspace
      - name: Deploy penalty_handler
        run: |
          soroban contract deploy \
            --wasm target/.../penalty_handler.wasm \
            --network testnet > penalty_address.txt
      - name: Deploy savings_circle
        run: |
          soroban contract deploy \
            --wasm target/.../savings_circle.wasm \
            --network testnet

  frontend:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: amondnet/vercel-action@v25
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Rust + Soroban SDK |
| Blockchain | Stellar Testnet |
| Frontend | React + Vite + Tailwind CSS |
| Wallet | Freighter API |
| Real-time round state | Horizon SSE (`RoundClosed`, `WinnerSelected`) |
| Countdown timer | Client-side ledger math |
| CI/CD | GitHub Actions + Vercel |
| Tests | `cargo test` (8 tests) + Vitest |

---

## Submission Checklist Coverage

- [x] Advanced smart contract development — collateral logic, round management, winner selection
- [x] Inter-contract communication — circle contract calls penalty handler per defaulter
- [x] Event streaming — deposit receipts, round closure, winner announcements live
- [x] CI/CD pipeline — ordered deploy with penalty contract address passed to circle
- [x] Mobile responsive frontend — avatar member grid, countdown, deposit CTA
- [x] Error handling & loading states — deposit tx pending, round not yet closeable error
- [x] Tests — 8 tests covering happy path, default, slash, and auth
- [x] Documentation — this README

---

## Demo Video Script (1–2 min)

1. Create a circle — 4 members, 5 XLM each, short round interval (demo mode)
2. Join from 4 different test wallets — show "seats taken" filling up
3. Each wallet deposits for Round 1 — show green ticks appearing in real time
4. Close Round 1 — winner selected, pot arrives in winner's wallet
5. In Round 2 — have one wallet miss the deposit
6. Close Round 2 — show penalty handler called, defaulter slashed, remaining members receive slash share
7. Show CI pipeline passing

---

## Unique Architecture Angle

The penalty handler is a generic slashing contract — it knows nothing about circles. It just receives a defaulter address, a collateral amount, and a recipient list, then distributes. This makes it reusable for any future contract that needs a collateral-slash-and-distribute mechanism, completely independent of the savings circle's round logic.
