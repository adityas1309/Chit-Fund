# Deployment Record

**Network:** Stellar Testnet (Test SDF Network ; September 2015)
**Deployed:** 2026-06-21
**Network Passphrase:** Test SDF Network ; September 2015

## Contract Addresses

| Contract             | Address |
|----------------------|---------|
| savings_circle       | `CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E` |
| penalty_handler      | `CA6QMZ2CA3WETF2IKWYBIKRRG4VTQIQVOZGMQ5HMLGRZUE4THANL33C4` |
| SUSU SAC (test only) | `CBDGYAUQA6ESWB3BGYOCW5PJFGQ5SYNUJEMDZDME36J2R5F7TXLAJ6CR` |
| Native XLM SAC       | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

## Deployer

`GB3UD425FJS43QKH6X2MD3NIEIWW4KSRVFNXLVS6ONV4WA6ACIJ6N3FU`

## Transaction Hashes

| Step                                | Tx Hash |
|-------------------------------------|---------|
| Install + deploy penalty_handler    | `9b8b49a10a51fa28dff5c4d699f61ae79631202eafec152a1920553e50dba04a` |
| Install + deploy savings_circle     | `50d2c9deee16cb39b376426fb50e6f6e3150c6213a35a0ed5521c9badaf38659` |
| Deploy SUSU SAC                     | `667384306d739962e2872d0fcb756e5cf01456a598da387e1910060118ea007e` |
| Init penalty_handler (auth=caller)  | `4f6fddf541025da9cc44107acc60305a06d486473f5b49964c7449d23b18a305` |
| Init savings_circle (penalty=...)   | `e4269b67dcc0dc12c4bdbdc1c5854b6e745fcee130caefa31d035e8eee6b3fd0` |
| **create_circle (test txn)**        | `77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084` |

## Stellar Expert Links

- Penalty handler: https://stellar.expert/explorer/testnet/contract/CA6QMZ2CA3WETF2IKWYBIKRRG4VTQIQVOZGMQ5HMLGRZUE4THANL33C4
- Savings circle: https://stellar.expert/explorer/testnet/contract/CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E
- create_circle tx: https://stellar.expert/explorer/testnet/tx/77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084

## Verification (post-deploy read calls)

```bash
stellar contract invoke --id CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E --source deployer --network testnet -- next_circle_id
# => 1

stellar contract invoke --id CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E --source deployer --network testnet -- list_open_circles
# => [0]

stellar contract invoke --id CBUZIODOJN7GV673ZGPNMOBZ6354GHKCNKXEWNINHEYR5NP6622OMM7E --source deployer --network testnet -- get_circle_state --circle_id 0
# => { state: "Open", member_count: 1, max_members: 4, deposit_amount: 100000000,
#      selection_mode: "RoundRobin", current_round: 1, ... }
```

## Live Frontend

Configure `frontend/.env` with the addresses above, then:

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel / Netlify
```

The current `frontend/.env` is already populated for local development.

## End-to-end test record

1. **create_circle** (tx `77435c33b501b6fd81a1e2f88149432d12e1edb812e077c098ebab43605e8084`) - creator=deployer, 4 members, 10 XLM
   per round, 60-ledger intervals, RoundRobin selection. The
   `CircleCreated` event fired with the full configuration.

2. **State read-back** - all read methods return the expected values:
   `next_circle_id = 1`, `get_all_circles = [0]`, `list_open_circles = [0]`.

3. **Next steps (from the deployed UI):**
   - Have 3 other test wallets approve + join the circle (each locks 10
     XLM of collateral via the SAC).
   - Each member deposits 10 XLM per round.
   - Close round after the deadline; the winner gets the pot.
