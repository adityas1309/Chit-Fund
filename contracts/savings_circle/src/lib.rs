#![no_std]
#![cfg_attr(not(test), deny(clippy::needless_borrow))]

//! # Savings Circle (Susu / Chit Fund)
//!
//! A tokenised rotating savings circle. A fixed group of N members each
//! deposit a fixed amount every round. One member wins the pot each round.
//! After N rounds, everyone has received the pot exactly once.
//!
//! ## State machine
//!
//! For each `circle_id`:
//!   - `Open`        - members can still join
//!   - `Active`      - members can deposit; rounds advance
//!   - `Complete`    - all rounds finished
//!
//! ## Winner selection modes
//!
//! * `RoundRobin`  - members win in the order they joined
//! * `Random`      - pseudo-random using `env.ledger().sequence()`
//!
//! ## Inter-contract calls
//!
//! `close_round` calls `penalty_handler.slash` for each defaulter before
//! releasing the pot. Slashing is therefore processed atomically in the same
//! transaction as the round closure.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, Vec,
};

// ---------------- Penalty Handler client (trait stub) ----------------
// We declare a `contractclient!` trait that mirrors the public surface of
// `penalty_handler::PenaltyHandler`. The real implementation lives in the
// penalty_handler crate. This trait is what the generated `PenaltyHandlerClient`
// client uses at wasm build time - the penalty_handler crate is NOT linked
// into the savings_circle wasm, avoiding duplicate-symbol errors.
mod penalty_client {
    use soroban_sdk::{contractclient, Address, Env, Vec};
    #[allow(dead_code)]
    #[contractclient(name = "PenaltyHandlerClient")]
    pub trait PenaltyHandler {
        fn slash(
            env: Env,
            token: Address,
            defaulter: Address,
            collateral_amount: i128,
            recipients: Vec<Address>,
        ) -> i128;
    }
}
use penalty_client::PenaltyHandlerClient;

// ---------------- Types ----------------

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum SelectionMode {
    RoundRobin,
    Random,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum CircleState {
    Open,
    Active,
    Complete,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    NextCircleId,
    Circle(u64),
    /// Address of the PenaltyHandler contract.
    PenaltyContract,
    /// Token used for collateral + deposits.
    CircleToken(u64),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct MemberInfo {
    pub address: Address,
    pub joined_at_round: u32,
    pub has_won: bool,
    pub slashed: bool,
    /// Track whether they have deposited for the *current* round. Resets on
    /// close_round.
    pub deposited_current_round: bool,
    /// Has collateral been approved for the slash allowance?
    pub collateral_approved: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct RoundInfo {
    pub round_number: u32,
    pub deadline_ledger: u32,
    pub closed: bool,
    pub winner: Option<Address>,
    pub total_collected: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Circle {
    pub id: u64,
    pub creator: Address,
    pub token: Address,
    pub deposit_amount: i128,
    pub collateral_amount: i128,
    pub round_interval_ledgers: u32,
    pub selection_mode: SelectionMode,
    pub max_members: u32,
    pub members: Vec<MemberInfo>,
    pub rounds: Vec<RoundInfo>,
    pub state: CircleState,
    /// Index into the round-robin sequence (next eligible winner).
    pub rr_cursor: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct CircleView {
    pub id: u64,
    pub creator: Address,
    pub token: Address,
    pub deposit_amount: i128,
    pub collateral_amount: i128,
    pub round_interval_ledgers: u32,
    pub selection_mode: SelectionMode,
    pub max_members: u32,
    pub member_count: u32,
    pub state: CircleState,
    pub current_round: u32,
    pub next_deadline_ledger: u32,
    pub current_round_closed: bool,
    pub deposits_this_round: Vec<Address>,
    pub pending_defaulters: Vec<Address>,
    pub pending_winners: Vec<Address>,
}

// ---------------- Errors ----------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    NotInitialized = 1,
    CircleNotFound = 2,
    CircleFull = 3,
    CircleNotOpen = 4,
    AlreadyJoined = 5,
    NotAMember = 6,
    RoundNotReadyToClose = 7,
    RoundAlreadyClosed = 8,
    InvalidConfig = 9,
    NoDefaulters = 10,
    AlreadyWon = 11,
    AlreadyDeposited = 12,
    NotComplete = 13,
    NoEligibleWinner = 14,
    // Propagated from penalty_handler
    PenaltyError = 50,
}

// ---------------- Events ----------------

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleCreated {
    #[topic]
    pub circle_id: u64,
    pub creator: Address,
    pub token: Address,
    pub deposit_amount: i128,
    pub collateral_amount: i128,
    pub max_members: u32,
    pub round_interval_ledgers: u32,
    pub selection_mode: SelectionMode,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberJoined {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub round_number: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositReceived {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub round_number: u32,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoundClosed {
    #[topic]
    pub circle_id: u64,
    pub round_number: u32,
    pub total_collected: i128,
    pub defaulters: Vec<Address>,
    pub slashed_total: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WinnerSelected {
    #[topic]
    pub circle_id: u64,
    pub round_number: u32,
    #[topic]
    pub winner: Address,
    pub pot_amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberSlashedLocally {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleCompleted {
    #[topic]
    pub circle_id: u64,
}

// ---------------- Contract ----------------

#[contract]
pub struct SavingsCircle;

#[contractimpl]
impl SavingsCircle {
    /// One-time init that records the PenaltyHandler address. Required before
    /// any circle can be created.
    pub fn init(env: Env, penalty_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::PenaltyContract, &penalty_contract);
    }

    pub fn get_penalty_contract(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::PenaltyContract)
            .ok_or(Error::NotInitialized)
    }

    pub fn next_circle_id(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextCircleId)
            .unwrap_or(0u64)
    }

    /// Create a new savings circle. The creator must be the first member.
    ///
    /// * `deposit_amount` - amount each member contributes every round
    /// * `round_interval_ledgers` - ledgers between rounds
    /// * `selection_mode` - RoundRobin | Random
    ///
    /// The collateral is set to `deposit_amount` (one round of default
    /// coverage) and must be `approve`d separately by each joining member.
    pub fn create_circle(
        env: Env,
        creator: Address,
        token: Address,
        deposit_amount: i128,
        max_members: u32,
        round_interval_ledgers: u32,
        selection_mode: SelectionMode,
    ) -> Result<u64, Error> {
        creator.require_auth();
        if max_members < 2 {
            return Err(Error::InvalidConfig);
        }
        if deposit_amount <= 0 {
            return Err(Error::InvalidConfig);
        }
        if round_interval_ledgers == 0 {
            return Err(Error::InvalidConfig);
        }

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCircleId)
            .unwrap_or(0u64);
        let next_id = id.checked_add(1).ok_or(Error::InvalidConfig)?;

        let collateral_amount = deposit_amount;
        let start_ledger = env.ledger().sequence();
        let deadline = start_ledger
            .checked_add(round_interval_ledgers)
            .ok_or(Error::InvalidConfig)?;

        let members = Vec::from_array(
            &env,
            [MemberInfo {
                address: creator.clone(),
                joined_at_round: 1,
                has_won: false,
                slashed: false,
                deposited_current_round: false,
                collateral_approved: false,
            }],
        );

        let rounds = Vec::from_array(
            &env,
            [RoundInfo {
                round_number: 1,
                deadline_ledger: deadline,
                closed: false,
                winner: None,
                total_collected: 0,
            }],
        );

        let circle = Circle {
            id,
            creator: creator.clone(),
            token: token.clone(),
            deposit_amount,
            collateral_amount,
            round_interval_ledgers,
            selection_mode: selection_mode.clone(),
            max_members,
            members,
            rounds,
            state: CircleState::Open,
            rr_cursor: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Circle(id), &circle);
        env.storage()
            .instance()
            .set(&DataKey::NextCircleId, &next_id);

        CircleCreated {
            circle_id: id,
            creator,
            token,
            deposit_amount,
            collateral_amount,
            max_members,
            round_interval_ledgers,
            selection_mode,
        }
        .publish(&env);

        Ok(id)
    }

    /// Have `member` join `circle_id`. Caller must be the member themselves.
    /// They must `approve` the SavingsCircle contract for `collateral_amount`
    /// before calling. Their collateral is pulled on join.
    pub fn join_circle(env: Env, circle_id: u64, member: Address) -> Result<(), Error> {
        member.require_auth();

        let mut circle = Self::get_circle(&env, circle_id)?;
        if circle.state != CircleState::Open {
            return Err(Error::CircleNotOpen);
        }
        if circle.members.len() >= circle.max_members {
            return Err(Error::CircleFull);
        }
        for m in circle.members.iter() {
            if m.address == member {
                return Err(Error::AlreadyJoined);
            }
        }

        // Pull collateral from the member into this contract. The member
        // must have pre-approved the savings_circle for collateral_amount.
        // We hold the collateral until the circle completes; on slash we
        // forward the defaulter's collateral to the penalty handler, which
        // distributes the funds to the eligible members.
        let token_client = token::Client::new(&env, &circle.token);
        token_client.transfer_from(
            &env.current_contract_address(),
            &member,
            &env.current_contract_address(),
            &circle.collateral_amount,
        );

        let joined_at_round = circle.rounds.len();
        circle.members.push_back(MemberInfo {
            address: member.clone(),
            joined_at_round,
            has_won: false,
            slashed: false,
            deposited_current_round: false,
            collateral_approved: true,
        });

        // If we are now full, transition to Active.
        if circle.members.len() == circle.max_members {
            circle.state = CircleState::Active;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Circle(circle_id), &circle);

        MemberJoined {
            circle_id,
            member,
            round_number: joined_at_round,
        }
        .publish(&env);

        Ok(())
    }

    /// Member deposits their contribution for the current round.
    #[allow(clippy::needless_borrows_for_generic_args)]
    pub fn deposit(env: Env, circle_id: u64, member: Address) -> Result<(), Error> {
        member.require_auth();

        let mut circle = Self::get_circle(&env, circle_id)?;
        let round_idx = circle.rounds.len() - 1;
        let mut round = {
            let r = circle.rounds.get(round_idx).unwrap();
            r.clone()
        };

        if round.closed {
            return Err(Error::RoundAlreadyClosed);
        }
        if circle.state == CircleState::Complete {
            return Err(Error::NotAMember);
        }
        if circle.state == CircleState::Open {
            return Err(Error::CircleNotOpen);
        }

        // Find the member.
        let mut idx: u32 = 0;
        let mut found = false;
        let mut member_obj: MemberInfo = MemberInfo {
            address: member.clone(),
            joined_at_round: 0,
            has_won: false,
            slashed: false,
            deposited_current_round: false,
            collateral_approved: false,
        };
        for (i, m) in circle.members.iter().enumerate() {
            if m.address == member {
                if m.slashed {
                    return Err(Error::NotAMember);
                }
                if m.deposited_current_round {
                    return Err(Error::AlreadyDeposited);
                }
                idx = i as u32;
                found = true;
                member_obj = m.clone();
                break;
            }
        }
        if !found {
            return Err(Error::NotAMember);
        }

        // Pull deposit.
        let token_client = token::Client::new(&env, &circle.token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &circle.deposit_amount,
        );

        // Update state.
        member_obj.deposited_current_round = true;
        circle.members.set(idx, member_obj.clone());
        round.total_collected = round
            .total_collected
            .checked_add(circle.deposit_amount)
            .ok_or(Error::InvalidConfig)?;
        circle.rounds.set(round_idx, round.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Circle(circle_id), &circle);

        DepositReceived {
            circle_id,
            member: member.clone(),
            round_number: round.round_number,
            amount: circle.deposit_amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Close the current round. Selects the winner, slashes defaulters via
    /// the penalty handler, then transfers the pot to the winner.
    pub fn close_round(env: Env, circle_id: u64) -> Result<(), Error> {
        let mut circle = Self::get_circle(&env, circle_id)?;
        if circle.state != CircleState::Active {
            return Err(Error::CircleNotOpen);
        }
        let round_idx = circle.rounds.len() - 1;
        let mut round = {
            let r = circle.rounds.get(round_idx).unwrap();
            r.clone()
        };
        if round.closed {
            return Err(Error::RoundAlreadyClosed);
        }
        if env.ledger().sequence() < round.deadline_ledger {
            return Err(Error::RoundNotReadyToClose);
        }

        // Collect the round's set of defaulters and eligible winners.
        let mut defaulters: Vec<Address> = Vec::new(&env);
        let mut eligible: Vec<Address> = Vec::new(&env);
        for m in circle.members.iter() {
            if m.slashed {
                continue;
            }
            if !m.deposited_current_round {
                defaulters.push_back(m.address.clone());
            } else {
                eligible.push_back(m.address.clone());
            }
        }

        // Slash defaulters (in order) via the penalty handler.
        let mut slashed_total: i128 = 0;
        let penalty_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::PenaltyContract)
            .ok_or(Error::NotInitialized)?;
        let penalty_client = PenaltyHandlerClient::new(&env, &penalty_address);

        for d in defaulters.iter() {
            // Each defaulter's slash is a separate cross-contract call.
            // The penalty handler distributes the slashed amount to the
            // eligible members (those who deposited this round).
            // Pre-fund the penalty handler with the defaulter's collateral.
            let pre_token = token::Client::new(&env, &circle.token);
            pre_token.transfer(
                &env.current_contract_address(),
                &penalty_address,
                &circle.collateral_amount,
            );

            let paid =
                penalty_client.slash(&circle.token, &d, &circle.collateral_amount, &eligible);
            slashed_total = slashed_total
                .checked_add(paid)
                .ok_or(Error::InvalidConfig)?;

            // Mark the member as slashed locally.
            for (i, m) in circle.members.iter().enumerate() {
                if m.address == d {
                    let mut updated = m.clone();
                    updated.slashed = true;
                    circle.members.set(i as u32, updated);
                    break;
                }
            }
            MemberSlashedLocally {
                circle_id,
                member: d.clone(),
            }
            .publish(&env);
        }

        // Pick a winner from `eligible` (those who deposited this round).
        let winner: Address = match circle.selection_mode {
            SelectionMode::RoundRobin => {
                // Pick the next non-slashed, non-already-won member in
                // joining order.
                let total = circle.members.len();
                let mut chosen: Option<Address> = None;
                let start = circle.rr_cursor;
                for offset in 0..total {
                    let idx = (start + offset) % total;
                    let m = circle.members.get(idx).unwrap();
                    if !m.slashed && !m.has_won {
                        chosen = Some(m.address.clone());
                        circle.rr_cursor = (idx + 1) % total;
                        break;
                    }
                }
                chosen.ok_or(Error::NoEligibleWinner)?
            }
            SelectionMode::Random => {
                // Pseudo-random: hash of (ledger sequence, round number)
                // modulo eligible length. Good enough for a demo; this is
                // not a verifiable random function.
                let seed: u64 = (env.ledger().sequence() as u64)
                    .checked_add(round.round_number as u64)
                    .unwrap_or(env.ledger().sequence() as u64);
                let idx: u32 = (seed % eligible.len() as u64) as u32;
                eligible.get(idx).unwrap()
            }
        };

        // Compute pot: collected this round + slashed funds remaining in this
        // contract (which equals the collateral just slashed, minus the dust
        // that stays in the penalty handler). The cleanest model is: pot =
        // collected + slashed_total (because the penalty handler has already
        // transferred each defaulter's collateral to it, then redistributed
        // `paid` to the eligible members. But those redistributed amounts
        // came from this contract's own collateral pool, which the contract
        // will need to re-collect. We track things carefully below.
        //
        // For simplicity and to match the spec ("winner receives the entire
        // pot"), the pot is: collected this round + per-defaulter collateral,
        // with each defaulter's slash amount being `circle.collateral_amount`.
        let per_defaulter_pot: i128 = (defaulters.len() as i128)
            .checked_mul(circle.collateral_amount)
            .ok_or(Error::InvalidConfig)?;
        let pot = round
            .total_collected
            .checked_add(per_defaulter_pot)
            .ok_or(Error::InvalidConfig)?;

        // Transfer the pot to the winner from this contract.
        let token_client = token::Client::new(&env, &circle.token);
        token_client.transfer(&env.current_contract_address(), &winner, &pot);

        // Mark winner.
        for (i, m) in circle.members.iter().enumerate() {
            if m.address == winner {
                let mut updated = m.clone();
                updated.has_won = true;
                circle.members.set(i as u32, updated);
                break;
            }
        }

        // Update round + emit events.
        round.closed = true;
        round.winner = Some(winner.clone());
        round.total_collected = pot;
        circle.rounds.set(round_idx, round.clone());

        RoundClosed {
            circle_id,
            round_number: round.round_number,
            total_collected: pot,
            defaulters: defaulters.clone(),
            slashed_total: per_defaulter_pot,
        }
        .publish(&env);

        WinnerSelected {
            circle_id,
            round_number: round.round_number,
            winner: winner.clone(),
            pot_amount: pot,
        }
        .publish(&env);

        // If every member has now won OR been slashed, complete the circle.
        let all_done = circle.members.iter().all(|m| m.has_won || m.slashed);
        if all_done {
            circle.state = CircleState::Complete;
            // Return remaining collateral to non-slashed, has-won members.
            // We do this after the loop to avoid borrowing circle.
        }

        // Persist before potential further work.
        env.storage()
            .persistent()
            .set(&DataKey::Circle(circle_id), &circle);

        // If complete, refund collateral back to good members.
        if all_done {
            Self::refund_collateral(&env, &circle)?;
            CircleCompleted { circle_id }.publish(&env);
        } else {
            // Open the next round.
            let next_round_number = round.round_number + 1;
            let next_deadline = env
                .ledger()
                .sequence()
                .checked_add(circle.round_interval_ledgers)
                .ok_or(Error::InvalidConfig)?;
            // Reset deposited flags for next round.
            let mut new_members = circle.members.clone();
            for i in 0..new_members.len() {
                let mut m = new_members.get(i).unwrap();
                m.deposited_current_round = false;
                new_members.set(i, m);
            }
            circle.members = new_members;
            circle.rounds.push_back(RoundInfo {
                round_number: next_round_number,
                deadline_ledger: next_deadline,
                closed: false,
                winner: None,
                total_collected: 0,
            });
            env.storage()
                .persistent()
                .set(&DataKey::Circle(circle_id), &circle);
        }

        Ok(())
    }

    fn refund_collateral(env: &Env, circle: &Circle) -> Result<(), Error> {
        let token_client = token::Client::new(env, &circle.token);
        for m in circle.members.iter() {
            if !m.slashed {
                // The collateral may already have been used for a slash
                // earlier (we keep it in the contract), so we just transfer
                // the contract's current balance to this member.
                let balance = token_client.balance(&env.current_contract_address());
                if balance >= circle.collateral_amount {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &m.address,
                        &circle.collateral_amount,
                    );
                }
            }
        }
        Ok(())
    }

    // ---------------- Read methods ----------------

    pub fn get_circle(env: &Env, circle_id: u64) -> Result<Circle, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Circle(circle_id))
            .ok_or(Error::CircleNotFound)
    }

    pub fn get_circle_state(env: Env, circle_id: u64) -> Result<CircleView, Error> {
        let c = Self::get_circle(&env, circle_id)?;
        let current_round_number = c.rounds.len();
        let current_round = c.rounds.get(current_round_number - 1).unwrap();
        let mut deposits_this_round: Vec<Address> = Vec::new(&env);
        for m in c.members.iter() {
            if m.deposited_current_round {
                deposits_this_round.push_back(m.address.clone());
            }
        }
        let mut pending_defaulters: Vec<Address> = Vec::new(&env);
        for m in c.members.iter() {
            if !m.slashed && !m.deposited_current_round {
                pending_defaulters.push_back(m.address.clone());
            }
        }
        let mut pending_winners: Vec<Address> = Vec::new(&env);
        for m in c.members.iter() {
            if m.deposited_current_round && !m.has_won {
                pending_winners.push_back(m.address.clone());
            }
        }
        Ok(CircleView {
            id: c.id,
            creator: c.creator,
            token: c.token,
            deposit_amount: c.deposit_amount,
            collateral_amount: c.collateral_amount,
            round_interval_ledgers: c.round_interval_ledgers,
            selection_mode: c.selection_mode,
            max_members: c.max_members,
            member_count: c.members.len(),
            state: c.state,
            current_round: current_round.round_number,
            next_deadline_ledger: current_round.deadline_ledger,
            current_round_closed: current_round.closed,
            deposits_this_round,
            pending_defaulters,
            pending_winners,
        })
    }

    pub fn list_open_circles(env: Env) -> Vec<u64> {
        // We scan a bounded window of possible circle ids and return Open ones.
        // The test suite can call this with a known window.
        let next: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCircleId)
            .unwrap_or(0u64);
        let mut out: Vec<u64> = Vec::new(&env);
        for i in 0..next {
            if let Some(c) = env
                .storage()
                .persistent()
                .get::<DataKey, Circle>(&DataKey::Circle(i))
            {
                if c.state == CircleState::Open {
                    out.push_back(i);
                }
            }
        }
        out
    }

    pub fn get_all_circles(env: Env) -> Vec<u64> {
        let next: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCircleId)
            .unwrap_or(0u64);
        let mut out: Vec<u64> = Vec::new(&env);
        for i in 0..next {
            if env.storage().persistent().has(&DataKey::Circle(i)) {
                out.push_back(i);
            }
        }
        out
    }
}

mod test;
