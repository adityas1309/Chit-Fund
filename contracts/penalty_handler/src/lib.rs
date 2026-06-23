#![no_std]

//! # Penalty Handler
//!
//! A generic, reusable contract that takes a pre-funded `collateral_amount`
//! of a token and redistributes it equally among a list of recipients. It is
//! intentionally ignorant of any higher-level protocol (rotating savings,
//! lending, etc.) so it can be plugged into any future contract that needs a
//! collateral-slash-and-distribute mechanism.
//!
//! ## Trust model
//!
//! The contract only accepts calls from an authorised caller address (the
//! `savings_circle` contract, or any other contract that the deployer
//! whitelists). This prevents griefing where an unrelated party drains
//! collateral.
//!
//! ## Fund model
//!
//! The caller is expected to have already moved the funds into this contract
//! (typically via a `transfer` from the defaulter to this contract, performed
//! by the savings_circle). This contract never pulls funds from the defaulter
//! directly - it only handles the equal-split bookkeeping and emits the
//! public events.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, Vec,
};

#[derive(Clone, Debug)]
#[contracttype]
pub enum DataKey {
    /// The single address authorised to call `slash` (e.g. savings_circle).
    Auth,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    /// The contract has not been initialised with an authorised caller.
    NotInitialized = 1,
    /// The caller is not the authorised slash invoker.
    Unauthorized = 2,
    /// The recipients list is empty.
    EmptyList = 3,
    /// The slash amount must be strictly positive.
    ZeroAmount = 4,
    /// Token transfer failed.
    TransferFailed = 5,
    /// Arithmetic overflow.
    Overflow = 6,
    /// The contract does not hold enough of the requested token.
    InsufficientContractBalance = 7,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberSlashed {
    #[topic]
    pub defaulter: Address,
    pub collateral_amount: i128,
    pub recipients_count: u32,
    pub share_per_recipient: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DistributionCompleted {
    pub total: i128,
    pub recipients_count: u32,
}

#[contract]
pub struct PenaltyHandler;

#[contractimpl]
impl PenaltyHandler {
    /// One-time initialisation. Stores the address of the only contract that
    /// may invoke `slash` (typically the savings_circle contract).
    pub fn init(env: Env, authorized_caller: Address) {
        env.storage()
            .instance()
            .set(&DataKey::Auth, &authorized_caller);
    }

    /// Read-only accessor for the authorised caller (used by tests + UIs).
    pub fn get_authorized_caller(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Auth)
            .ok_or(Error::NotInitialized)
    }

    /// Slash `defaulter` and distribute `collateral_amount` of `token` equally
    /// among the members of `recipients`.
    ///
    /// The caller is expected to have already moved `collateral_amount` into
    /// this contract. The slash is then performed by transferring
    /// `floor(amount / recipients)` to each recipient. Any remainder
    /// (rounding dust) is left in this contract and is treated as protocol
    /// revenue - it is intentionally not refunded to the defaulter.
    pub fn slash(
        env: Env,
        token: Address,
        defaulter: Address,
        collateral_amount: i128,
        recipients: Vec<Address>,
    ) -> Result<i128, Error> {
        // 1. Authorisation: only the configured savings_circle contract.
        let auth: Address = env
            .storage()
            .instance()
            .get(&DataKey::Auth)
            .ok_or(Error::NotInitialized)?;
        auth.require_auth();

        // 2. Basic validation.
        if collateral_amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        if recipients.is_empty() {
            return Err(Error::EmptyList);
        }

        // 3. Compute the per-recipient share, with overflow protection.
        let count: i128 = i128::from(recipients.len());
        let share = collateral_amount
            .checked_div(count)
            .ok_or(Error::Overflow)?;
        let total_paid = share.checked_mul(count).ok_or(Error::Overflow)?;

        // 4. Distribute from this contract to each recipient. The caller
        //    is expected to have already transferred the funds to us.
        let token_client = token::Client::new(&env, &token);
        for recipient in recipients.iter() {
            token_client.transfer(&env.current_contract_address(), &recipient, &share);
        }

        // 5. Emit the public event stream used by the frontend.
        MemberSlashed {
            defaulter: defaulter.clone(),
            collateral_amount,
            recipients_count: recipients.len(),
            share_per_recipient: share,
        }
        .publish(&env);

        DistributionCompleted {
            total: total_paid,
            recipients_count: recipients.len(),
        }
        .publish(&env);

        Ok(total_paid)
    }

    /// Returns any rounding dust held by this contract (for the token
    /// currently held). Useful for protocol accounting in tests.
    pub fn balance(env: Env, token: Address) -> i128 {
        token::Client::new(&env, &token).balance(&env.current_contract_address())
    }
}

#[cfg(test)]
mod test;
