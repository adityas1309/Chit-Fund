#![cfg(test)]
#![allow(deprecated, unused_imports, unused_variables, dead_code)]

//! Integration tests for the SavingsCircle contract.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, vec, Address, Env,
};

fn create_token<'a>(env: &Env, admin: &Address) -> token::StellarAssetClient<'a> {
    let token_address = env.register_stellar_asset_contract(admin.clone());
    token::StellarAssetClient::new(env, &token_address)
}

fn token_client<'a>(env: &Env, token_address: &Address) -> token::Client<'a> {
    token::Client::new(env, token_address)
}

fn mint(sac: &token::StellarAssetClient, to: &Address, amount: &i128) {
    sac.mock_all_auths().mint(to, amount);
}

fn approve_collateral(
    env: &Env,
    token: &Address,
    member: &Address,
    spender: &Address,
    amount: i128,
) {
    let t = token::Client::new(env, token);
    t.approve(member, spender, &amount, &10_000);
}

// Approve the savings circle to pull the member's collateral. The slash
// itself is performed by the penalty handler against the savings_circle.
fn approve_penalty(env: &Env, token: &Address, member: &Address, spender: &Address, amount: i128) {
    let t = token::Client::new(env, token);
    t.approve(member, spender, &amount, &10_000);
}

struct Harness {
    env: Env,
    admin: Address,
    penalty_id: Address,
    circle_id: Address,
    token: Address,
    #[allow(dead_code)]
    sac: token::StellarAssetClient<'static>,
    penalty_client: penalty_handler::PenaltyHandlerClient<'static>,
    circle_client: SavingsCircleClient<'static>,
}

impl Harness {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let sac = create_token(&env, &admin);
        let token = sac.address.clone();

        let penalty_id = env.register(penalty_handler::PenaltyHandler, ());
        let circle_id = env.register(SavingsCircle, ());

        let penalty_client = penalty_handler::PenaltyHandlerClient::new(&env, &penalty_id);
        let circle_client = SavingsCircleClient::new(&env, &circle_id);

        penalty_client.init(&circle_id);
        circle_client.init(&penalty_id);

        Harness {
            env,
            admin,
            penalty_id,
            circle_id,
            token,
            sac,
            penalty_client,
            circle_client,
        }
    }
}

fn advance_ledger_past_deadline(env: &Env, deadline: u32) {
    let mut seq = env.ledger().sequence();
    while seq < deadline + 1 {
        env.ledger().set_sequence_number(seq + 1);
        seq = env.ledger().sequence();
    }
}

#[test]
fn test_circle_creation_locks_collateral() {
    let h = Harness::setup();
    let deposit: i128 = 100;
    let n: u32 = 3;

    let creator = Address::generate(&h.env);
    mint(&h.sac, &creator, &10_000);

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &deposit,
        &n,
        &10u32,
        &SelectionMode::RoundRobin,
    );
    assert_eq!(circle_id, 0);

    for _ in 0..2 {
        let m = Address::generate(&h.env);
        mint(&h.sac, &m, &10_000);
        approve_penalty(&h.env, &h.token, &m, &h.circle_id, deposit);
        h.circle_client.join_circle(&circle_id, &m);
    }

    let bal = token_client(&h.env, &h.token).balance(&h.circle_id);
    assert_eq!(bal, 200);
}

#[test]
fn test_deposit_recorded_for_correct_member() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    mint(&h.sac, &creator, &10_000);

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &100i128,
        &2u32,
        &10u32,
        &SelectionMode::RoundRobin,
    );

    let m2 = Address::generate(&h.env);
    mint(&h.sac, &m2, &10_000);
    approve_penalty(&h.env, &h.token, &m2, &h.circle_id, 100);
    h.circle_client.join_circle(&circle_id, &m2);

    h.circle_client.deposit(&circle_id, &creator);

    let view = h.circle_client.get_circle_state(&circle_id);
    assert_eq!(view.current_round, 1);
    assert_eq!(view.deposits_this_round.len(), 1);
    assert_eq!(view.deposits_this_round.get(0).unwrap(), creator);
    assert!(!view.current_round_closed);
}

#[test]
fn test_non_member_cannot_deposit() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    mint(&h.sac, &creator, &10_000);

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &50i128,
        &2u32,
        &10u32,
        &SelectionMode::RoundRobin,
    );

    let m2 = Address::generate(&h.env);
    mint(&h.sac, &m2, &10_000);
    approve_penalty(&h.env, &h.token, &m2, &h.circle_id, 50);
    h.circle_client.join_circle(&circle_id, &m2);

    let outsider = Address::generate(&h.env);
    mint(&h.sac, &outsider, &10_000);

    let res = h.circle_client.try_deposit(&circle_id, &outsider);
    assert_eq!(res, Err(Ok(Error::NotAMember)));
}

#[test]
fn test_round_closes_correctly() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    mint(&h.sac, &creator, &10_000);

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &50i128,
        &2u32,
        &10u32,
        &SelectionMode::RoundRobin,
    );

    let m2 = Address::generate(&h.env);
    mint(&h.sac, &m2, &10_000);
    approve_penalty(&h.env, &h.token, &m2, &h.circle_id, 50);
    h.circle_client.join_circle(&circle_id, &m2);

    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);

    let res = h.circle_client.try_close_round(&circle_id);
    assert_eq!(res, Err(Ok(Error::RoundNotReadyToClose)));

    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);

    h.circle_client.close_round(&circle_id);

    let v = h.circle_client.get_circle_state(&circle_id);
    assert_eq!(v.current_round, 2);
    assert!(!v.current_round_closed);
}

#[test]
fn test_winner_receives_full_pot() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    let m2 = Address::generate(&h.env);
    let m3 = Address::generate(&h.env);
    for m in [&creator, &m2, &m3] {
        mint(&h.sac, m, &10_000);
    }

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &100i128,
        &3u32,
        &5u32,
        &SelectionMode::RoundRobin,
    );

    for m in [&m2, &m3] {
        approve_penalty(&h.env, &h.token, m, &h.circle_id, 100);
        h.circle_client.join_circle(&circle_id, m);
    }

    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);
    h.circle_client.deposit(&circle_id, &m3);

    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);
    h.circle_client.close_round(&circle_id);

    let t = token::Client::new(&h.env, &h.token);
    assert_eq!(t.balance(&creator), 10_200);
}

#[test]
fn test_defaulter_is_slashed_and_removed() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    let m2 = Address::generate(&h.env);
    let m3 = Address::generate(&h.env);
    for m in [&creator, &m2, &m3] {
        mint(&h.sac, m, &10_000);
    }

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &100i128,
        &3u32,
        &5u32,
        &SelectionMode::RoundRobin,
    );

    for m in [&m2, &m3] {
        approve_penalty(&h.env, &h.token, m, &h.circle_id, 100);
        h.circle_client.join_circle(&circle_id, m);
    }

    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);

    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);
    h.circle_client.close_round(&circle_id);

    let c = h.circle_client.get_circle(&circle_id);
    let m3_info = c.members.iter().find(|m| m.address == m3).unwrap();
    assert!(m3_info.slashed);
    let creator_info = c.members.iter().find(|m| m.address == creator).unwrap();
    assert!(creator_info.has_won);
}

#[test]
fn test_slashed_collateral_distributed_to_remaining() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    let m2 = Address::generate(&h.env);
    let m3 = Address::generate(&h.env);
    for m in [&creator, &m2, &m3] {
        mint(&h.sac, m, &10_000);
    }

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &100i128,
        &3u32,
        &5u32,
        &SelectionMode::RoundRobin,
    );

    for m in [&m2, &m3] {
        approve_penalty(&h.env, &h.token, m, &h.circle_id, 100);
        h.circle_client.join_circle(&circle_id, m);
    }

    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);

    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);
    h.circle_client.close_round(&circle_id);

    // creator: 10_000 - 100 (deposit) + 300 (pot) + 50 (slash share) = 10_250
    let t = token::Client::new(&h.env, &h.token);
    let creator_after = t.balance(&creator);
    assert_eq!(creator_after, 10_250);

    // m2: 10_000 - 100 (collateral) - 100 (deposit) + 50 (slash share) = 9_850
    let m2_after = t.balance(&m2);
    assert_eq!(m2_after, 9_850);

    // m3: 10_000 - 100 (collateral) = 9_900
    let m3_after = t.balance(&m3);
    assert_eq!(m3_after, 9_900);

    assert_eq!(h.penalty_client.balance(&t.address), 0);
}

#[test]
fn test_already_won_member_cannot_win_again() {
    let h = Harness::setup();
    let creator = Address::generate(&h.env);
    let m2 = Address::generate(&h.env);
    for m in [&creator, &m2] {
        mint(&h.sac, m, &10_000);
    }

    let circle_id = h.circle_client.create_circle(
        &creator,
        &h.token,
        &100i128,
        &2u32,
        &5u32,
        &SelectionMode::RoundRobin,
    );

    approve_penalty(&h.env, &h.token, &m2, &h.circle_id, 100);
    h.circle_client.join_circle(&circle_id, &m2);

    // Round 1.
    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);
    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);
    h.circle_client.close_round(&circle_id);

    // Round 2.
    h.circle_client.deposit(&circle_id, &creator);
    h.circle_client.deposit(&circle_id, &m2);
    let view = h.circle_client.get_circle_state(&circle_id);
    advance_ledger_past_deadline(&h.env, view.next_deadline_ledger);
    h.circle_client.close_round(&circle_id);

    let c = h.circle_client.get_circle(&circle_id);
    assert_eq!(c.state, CircleState::Complete);
    let creator_info = c.members.iter().find(|m| m.address == creator).unwrap();
    let m2_info = c.members.iter().find(|m| m.address == m2).unwrap();
    assert!(creator_info.has_won);
    assert!(m2_info.has_won);
    assert_eq!(c.rounds.get(1).unwrap().winner, Some(m2));
}
