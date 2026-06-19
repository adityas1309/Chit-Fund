# Deployment Record

> **Status:** demo build is reproducible end-to-end on Stellar Testnet.
> The addresses below are populated by `scripts/deploy-testnet.sh` after
> a real deployment. For a fully reproducible demo, the CI workflow in
> `.github/workflows/ci.yml` re-deploys on every push to `main` and
> uploads the resulting addresses as artifacts.

## Live deployment (latest)

> **Note** — the slots below are placeholders until a real testnet
> deployment is run. To populate them:

```bash
SAC_TOKEN=<your-testnet-sac-token> bash scripts/deploy-testnet.sh
```

| Item                          | Value |
|-------------------------------|-------|
| SAVINGS_CIRCLE_CONTRACT_ID    | TBD   |
| PENALTY_HANDLER_CONTRACT_ID   | TBD   |
| CIRCLE_TOKEN_CONTRACT_ID      | TBD   |
| First transaction hash        | TBD   |

## Frontend

* **Live URL:** _deployed via Vercel on every push to `main`_ —
  see the GitHub Actions badge in `README.md` for the latest link.
* **Build command:** `cd frontend && npm run build`
* **Output directory:** `frontend/dist`

## CI/CD

* **Workflow:** `.github/workflows/ci.yml`
* **Status badge:** see top of `README.md`
* **What runs:** Rust lint + test + WASM build, then frontend
  typecheck + lint + test + build, then a testnet deploy step.
* **Required secrets (set in GitHub repo settings):**
  * `SOROBAN_SECRET_KEY` — funded testnet identity
  * `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — for frontend
  * `SAVINGS_CIRCLE_CONTRACT_ID`, `PENALTY_HANDLER_CONTRACT_ID`,
    `CIRCLE_TOKEN_CONTRACT_ID` — injected at frontend build time

## How to re-deploy from scratch

1. Generate a testnet identity: `soroban keys generate deployer --network testnet`.
2. Fund it: `curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"`.
3. Issue (or reuse) a testnet SAC token, capture its `C...` address.
4. Run `SAC_TOKEN=<C...> bash scripts/deploy-testnet.sh`. The script
   writes `.penalty_address` and `.savings_address` and prints the
   final `VITE_*` env entries to add to `frontend/.env`.
5. Commit and push — the CI workflow will rebuild and re-deploy
   automatically.
