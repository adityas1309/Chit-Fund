# Security Considerations

> A brief summary of the trust model and the known limitations of the
> current implementation. Not a substitute for a formal audit.

## Trust model

* **The contract is the treasurer.** No human or multisig holds the
  pot. There is no upgrade path, no admin key, and no pause switch.
* **Collateral is locked by the user** via a token `approve` followed
  by the contract's `transfer_from` on `join_circle`. The contract
  holds the collateral in its own balance until the circle completes
  or the user is slashed.
* **Slashing is one-way.** Once a member is slashed, they cannot
  un-slash. Collateral is split atomically in the same transaction as
  the round closure.

## Known limitations

### On-chain randomness

The `Random` selection mode uses `(ledger_sequence + round_number) %
eligible.len` as a seed. This is **predictable to a sophisticated
attacker** who can read the ledger and simulate round closures.
Production deployments with real value at stake must use a verifiable
random function (VRF) or commit-reveal scheme instead.

### Single authorised caller

`penalty_handler` only accepts `slash()` calls from one address
(stored at init time). If that contract's `init()` is never called, or
is called with a wrong address, slashing is broken. The integration
tests cover this, but a redeploy must call `init` in the right order
— the `deploy-testnet.sh` script enforces this.

### Token allowance lifecycle

Members must `approve` the savings circle for both their collateral
and their round deposit. The frontend handles this automatically by
issuing an `approve` immediately before each `join` and `deposit`. If
the approve is revoked between the two transactions, the second call
will fail with `TransferFailed`.

### Storage TTLs

The contract uses `env.storage().persistent()` for circle state. The
SDK bumps the TTL on every write, but a circle that is never written
to (e.g. the creator abandons it before anyone joins) may eventually
fall out of state. A `bump` mechanism is a reasonable future
addition.

## Reporting issues

Please open a GitHub issue or email `security@example.com`. Do not
file a public issue for vulnerabilities that put user funds at risk.
