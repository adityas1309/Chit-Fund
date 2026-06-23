#![allow(deprecated, unused_imports, unused_variables, dead_code)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token, vec, Address, Env, IntoVal, Vec,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let token_address = env.register_stellar_asset_contract(admin.clone());
    token::Client::new(env, &token_address)
}

fn mint(env: &Env, token: &token::Client, to: &Address, amount: i128) {
    let sac = token::StellarAssetClient::new(env, &token.address);
    sac.mint(to, &amount);
}

#[test]
fn test_init_stores_authorized_caller() {
    let env = Env::default();
    env.mock_all_auths();

    let caller = Address::generate(&env);

    let contract_id = env.register(PenaltyHandler, ());
    let client = PenaltyHandlerClient::new(&env, &contract_id);

    client.init(&caller);
    assert_eq!(client.get_authorized_caller(), caller);
}

#[test]
fn test_unauthorized_caller_rejected() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let authorised = Address::generate(&env);
    let defaulter = Address::generate(&env);
    let unrelated = Address::generate(&env);

    let token_address = env.register_stellar_asset_contract(admin.clone());

    // Pre-fund the contract with the collateral that will be slashed.
    env.mock_all_auths();
    let token_client = token::Client::new(&env, &token_address);
    let sac = token::StellarAssetClient::new(&env, &token_address);
    let contract_id = env.register(PenaltyHandler, ());
    sac.mint(&contract_id, &1_000i128);

    let client = PenaltyHandlerClient::new(&env, &contract_id);
    client.init(&authorised);

    // Authorise only `unrelated` to call `slash`. The contract internally
    // calls `authorised.require_auth()` which will fail.
    env.set_auths(
        &[MockAuth {
            address: &unrelated,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "slash",
                args: (
                    &token_address,
                    &defaulter,
                    1_000i128,
                    Vec::from_array(&env, [Address::generate(&env)]),
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }]
        .map(Into::into),
    );

    let res = client.try_slash(
        &token_address,
        &defaulter,
        &1_000i128,
        &vec![&env, Address::generate(&env)],
    );
    assert!(res.is_err(), "slash must fail when caller != stored Auth");
}

#[test]
fn test_zero_amount_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorised = Address::generate(&env);

    let contract_id = env.register(PenaltyHandler, ());
    let client = PenaltyHandlerClient::new(&env, &contract_id);
    client.init(&authorised);

    let token = create_token_contract(&env, &admin);
    let defaulter = Address::generate(&env);

    let res = client.try_slash(
        &token.address,
        &defaulter,
        &0i128,
        &vec![&env, Address::generate(&env)],
    );
    assert_eq!(res, Err(Ok(Error::ZeroAmount)));
}

#[test]
fn test_empty_recipients_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorised = Address::generate(&env);

    let contract_id = env.register(PenaltyHandler, ());
    let client = PenaltyHandlerClient::new(&env, &contract_id);
    client.init(&authorised);

    let token = create_token_contract(&env, &admin);
    let defaulter = Address::generate(&env);

    let res = client.try_slash(&token.address, &defaulter, &100i128, &vec![&env]);
    assert_eq!(res, Err(Ok(Error::EmptyList)));
}

#[test]
fn test_happy_path_distributes_equally() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorised = Address::generate(&env);
    let defaulter = Address::generate(&env);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);
    let r3 = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let collateral = 999i128; // 999 / 3 = 333, no dust
    let contract_id = env.register(PenaltyHandler, ());
    // Pre-fund the handler with the collateral.
    let sac = token::StellarAssetClient::new(&env, &token.address);
    sac.mint(&contract_id, &collateral);

    let client = PenaltyHandlerClient::new(&env, &contract_id);
    client.init(&authorised);

    let paid = client.slash(
        &token.address,
        &defaulter,
        &collateral,
        &vec![&env, r1.clone(), r2.clone(), r3.clone()],
    );
    assert_eq!(paid, 999);

    let t = token::Client::new(&env, &token.address);
    assert_eq!(t.balance(&r1), 333);
    assert_eq!(t.balance(&r2), 333);
    assert_eq!(t.balance(&r3), 333);
    assert_eq!(t.balance(&defaulter), 0);
    assert_eq!(t.balance(&contract_id), 0);
}

#[test]
fn test_dust_stays_in_handler() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorised = Address::generate(&env);
    let defaulter = Address::generate(&env);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let collateral = 101i128; // 101 / 2 = 50, 1 unit dust
    let contract_id = env.register(PenaltyHandler, ());
    let sac = token::StellarAssetClient::new(&env, &token.address);
    sac.mint(&contract_id, &collateral);

    let client = PenaltyHandlerClient::new(&env, &contract_id);
    client.init(&authorised);

    let paid = client.slash(
        &token.address,
        &defaulter,
        &collateral,
        &vec![&env, r1.clone(), r2.clone()],
    );
    assert_eq!(paid, 100);

    let t = token::Client::new(&env, &token.address);
    assert_eq!(t.balance(&r1), 50);
    assert_eq!(t.balance(&r2), 50);
    assert_eq!(client.balance(&token.address), 1);
}
