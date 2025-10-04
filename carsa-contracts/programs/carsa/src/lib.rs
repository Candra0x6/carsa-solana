use anchor_lang::prelude::*;

// Import custom modules
pub mod error;
pub mod instructions;
pub mod state;

// Re-export for easier access
use error::*;
use instructions::*;
use state::*;

declare_id!("4rxv5KW47SDCVEQcgc2dDQxcWDyZ965SCTnA7sqF7gqT");

/// Main program module for the Carsa loyalty program
/// Manages Lokal token minting, distribution, and redemption
#[program]
pub mod carsa {
    use super::*;

    /// Initialize the Lokal token mint and program configuration
    /// This instruction sets up the SPL token mint with the program as authority
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn initialize_lokal_mint(ctx: Context<InitializeLokalMint>) -> Result<()> {
        InitializeLokalMint::handler(ctx)
    }

    /// Mint Lokal tokens to a user's token account
    /// Used for reward distribution when users make purchases at merchants
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `amount` - The amount of tokens to mint (in smallest unit, considering 9 decimals)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn mint_lokal_tokens(ctx: Context<MintLokalTokens>, amount: u64) -> Result<()> {
        MintLokalTokens::handler(ctx, amount)
    }

    /// Register a new merchant in the Carsa loyalty program
    /// This instruction creates a merchant account with specific cashback rates
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `name` - The merchant's display name (max 32 characters)
    /// * `category` - The merchant's business category (max 16 characters)
    /// * `cashback_rate` - The cashback percentage in basis points (e.g., 500 = 5%)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        name: String,
        category: String,
        cashback_rate: u16,
    ) -> Result<()> {
        RegisterMerchant::handler(ctx, name, category, cashback_rate)
    }

    /// Process a purchase transaction and distribute reward tokens
    /// This is the core instruction that implements the loyalty program logic
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `purchase_amount` - The purchase amount in SOL lamports
    /// * `transaction_id` - Unique identifier for this transaction (32 bytes)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn process_purchase(
        ctx: Context<ProcessPurchase>,
        purchase_amount: u64,
        transaction_id: [u8; 32],
    ) -> Result<()> {
        ProcessPurchase::handler(ctx, purchase_amount, transaction_id)
    }

    /// Update merchant settings such as cashback rate and active status
    /// Only the merchant owner can perform this operation
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `new_cashback_rate` - Optional new cashback rate in basis points
    /// * `is_active` - Optional new active status for the merchant
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn update_merchant(
        ctx: Context<UpdateMerchant>,
        new_cashback_rate: Option<u16>,
        is_active: Option<bool>,
    ) -> Result<()> {
        UpdateMerchant::handler(ctx, new_cashback_rate, is_active)
    }

    /// Transfer Lokal tokens between user accounts
    /// Enables peer-to-peer token transfers within the ecosystem
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `amount` - The amount of tokens to transfer (in smallest unit, considering 9 decimals)
    /// * `transaction_id` - Unique identifier for this transaction (32 bytes)
    /// * `memo` - Optional memo describing the transfer (max 64 characters)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn transfer_tokens(
        ctx: Context<TransferTokens>,
        amount: u64,
        transaction_id: [u8; 32],
        memo: String,
    ) -> Result<()> {
        TransferTokens::handler(ctx, amount, transaction_id, memo)
    }

    /// Redeem Lokal tokens at a merchant for discounts or payments
    /// This instruction handles the spending side of the loyalty program
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `token_amount` - The amount of tokens to redeem (in smallest unit, considering 9 decimals)
    /// * `fiat_value` - The fiat value of the purchase in lamports equivalent
    /// * `discount_rate` - The discount percentage in basis points (e.g., 1000 = 10%)
    /// * `transaction_id` - Unique identifier for this transaction (32 bytes)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn redeem_tokens(
        ctx: Context<RedeemTokens>,
        token_amount: u64,
        fiat_value: u64,
        discount_rate: u16,
        transaction_id: [u8; 32],
    ) -> Result<()> {
        RedeemTokens::handler(ctx, token_amount, fiat_value, discount_rate, transaction_id)
    }

    /// Burn Lokal tokens (optional deflation mechanism)
    /// Allows merchants to burn tokens they receive from redemptions
    /// 
    /// # Arguments
    /// * `ctx` - The instruction context containing required accounts
    /// * `amount` - The amount of tokens to burn (in smallest unit, considering 9 decimals)
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error result
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        BurnTokens::handler(ctx, amount)
    }

    /// Legacy initialize function for backwards compatibility
    /// This will be removed in future versions
    #[deprecated(note = "Use initialize_lokal_mint instead")]
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Legacy initialize called. Use initialize_lokal_mint instead.");
        msg!("Program ID: {:?}", ctx.program_id);
        Ok(())
    }
}

/// Legacy initialize accounts struct for backwards compatibility
#[derive(Accounts)]
pub struct Initialize {}
