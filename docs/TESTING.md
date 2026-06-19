# Testing

## Overview

The project has two independent test suites:

| Suite        | Tool        | Count | What it covers                                    |
|--------------|-------------|-------|---------------------------------------------------|
| Contracts    | `cargo test` | 14   | State, auth, slashing, winner selection, edges    |
| Frontend     | Vitest      | 8    | Providers, hooks, components, lib helpers         |

## Contract tests

```bash
cd contracts
cargo test --workspace
```

Expected output:

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

### Test matrix

| Test                                                | Type        | Coverage |
|-----------------------------------------------------|-------------|----------|
| `test_circle_creation_locks_collateral`             | Unit        | Contract balance post-create |
| `test_deposit_recorded_for_correct_member`          | Unit        | State check after deposit |
| `test_non_member_cannot_deposit`                    | Unit        | Auth error |
| `test_round_closes_correctly`                       | Unit        | Round number increments |
| `test_winner_receives_full_pot`                     | Unit        | Balance delta = N * deposit |
| `test_defaulter_is_slashed_and_removed`             | Integration | Penalty contract called |
| `test_slashed_collateral_distributed_to_remaining`  | Integration | Each member +slashShare |
| `test_already_won_member_cannot_win_again`          | Unit        | Round-robin skip logic |
| `test_init_stores_authorized_caller`                | Unit        | Auth stored on init |
| `test_unauthorized_caller_rejected`                 | Unit        | Non-auth caller rejected |
| `test_zero_amount_rejected`                         | Unit        | Validation edge case |
| `test_empty_recipients_rejected`                    | Unit        | Validation edge case |
| `test_happy_path_distributes_equally`               | Unit        | Equal split, no dust |
| `test_dust_stays_in_handler`                        | Unit        | Rounding dust behaviour |

## Frontend tests

```bash
cd frontend
npm test
```

Expected output:

```
 ? src/test/horizon.test.ts          (1 test)   5ms
 ? src/test/contract.test.ts         (1 test)   5ms
 ? src/test/toast.test.tsx           (1 test)  76ms
 ? src/test/wallet.test.tsx          (2 tests) 82ms
 ? src/test/components.test.tsx      (3 tests) 84ms

 Test Files  5 passed (5)
      Tests  8 passed (8)
```

## Lint and typecheck

```bash
cd contracts
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings

cd ../frontend
npm run lint
npm run typecheck
```

All four commands must exit `0` for CI to pass.
