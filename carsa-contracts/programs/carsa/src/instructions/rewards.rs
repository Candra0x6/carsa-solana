use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::error::CarsaError;

/// Register a new merchant in the Carsa loyalty program
/// This instruction creates a merchant account with specific cashback rates
#[derive(Accounts)]
#[instruction(name: String, category: String, cashback_rate: u16)]
pub struct RegisterMerchant<'info> {
    /// The merchant's wallet that will own this merchant account
    #[account(mut)]
    pub merchant_owner: Signer<'info>,
    
    /// The merchant account to be created
    /// Uses PDA for security and to prevent duplicate merchants
    #[account(
        init,
        payer = merchant_owner,
        space = MerchantAccount::LEN,
        seeds = [MERCHANT_SEED, merchant_owner.key().as_ref()],
        bump,
    )]
    pub merchant_account: Account<'info, MerchantAccount>,
    
    /// System program required for account creation
    pub system_program: Program<'info, System>,
}

/// Process a purchase transaction and distribute rewards
/// This is the core instruction that handles reward distribution logic
#[derive(Accounts)]
#[instruction(purchase_amount: u64, transaction_id: [u8; 32])]
pub struct ProcessPurchase<'info> {
    /// The customer making the purchase
    #[account(mut)]
    pub customer: Signer<'info>,
    
    /// The merchant account receiving the purchase
    #[account(
        mut,
        constraint = merchant_account.is_active @ CarsaError::MerchantNotActive
    )]
    pub merchant_account: Account<'info, MerchantAccount>,
    
    /// The Lokal token mint
    #[account(
        mut,
        constraint = mint.key() == config.mint @ CarsaError::MintAuthorityMismatch
    )]
    pub mint: Account<'info, Mint>,
    
    /// Program Derived Address that acts as the mint authority
    /// CHECK: This account is derived using seeds and verified in constraints
    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump = config.mint_authority_bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,
    
    /// Configuration account containing mint settings
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.config_bump,
    )]
    pub config: Account<'info, LokalMintConfig>,
    
    /// The customer's token account that will receive the reward tokens
    #[account(
        mut,
        constraint = customer_token_account.mint == mint.key()
    )]
    pub customer_token_account: Account<'info, TokenAccount>,
    
    /// Purchase transaction record for tracking
    #[account(
        init,
        payer = customer,
        space = PurchaseTransaction::LEN,
        seeds = [TRANSACTION_SEED, customer.key().as_ref(), &transaction_id],
        bump,
    )]
    pub transaction_record: Account<'info, PurchaseTransaction>,
    
    /// SPL Token program for mint operations
    pub token_program: Program<'info, Token>,
    
    /// System program required for account creation
    pub system_program: Program<'info, System>,
}

/// Update merchant settings (cashback rate, active status, etc.)
#[derive(Accounts)]
pub struct UpdateMerchant<'info> {
    /// The merchant's owner wallet
    #[account(mut)]
    pub merchant_owner: Signer<'info>,
    
    /// The merchant account to update
    #[account(
        mut,
        seeds = [MERCHANT_SEED, merchant_owner.key().as_ref()],
        bump = merchant_account.bump,
        constraint = merchant_account.merchant_wallet == merchant_owner.key() @ CarsaError::MerchantOwnerMismatch
    )]
    pub merchant_account: Account<'info, MerchantAccount>,
}

impl<'info> RegisterMerchant<'info> {
    /// Handler for registering a new merchant
    pub fn handler(
        ctx: Context<RegisterMerchant>,
        name: String,
        category: String,
        cashback_rate: u16,
    ) -> Result<()> {
        // Validate inputs
        require!(name.len() <= 32 && !name.is_empty(), CarsaError::InvalidMerchantName);
        require!(category.len() <= 16 && !category.is_empty(), CarsaError::InvalidMerchantCategory);
        require!(cashback_rate <= 10_000, CarsaError::InvalidCashbackRate); // Max 100%

        let merchant_account = &mut ctx.accounts.merchant_account;
        let clock = Clock::get()?;

        // Initialize merchant account
        merchant_account.merchant_wallet = ctx.accounts.merchant_owner.key();
        merchant_account.cashback_rate = cashback_rate;
        merchant_account.is_active = true;
        merchant_account.total_transactions = 0;
        merchant_account.total_rewards_distributed = 0;
        merchant_account.total_volume = 0;
        merchant_account.created_at = clock.unix_timestamp;
        merchant_account.bump = ctx.bumps.merchant_account;

        // Convert strings to fixed-size byte arrays with padding
        let mut name_bytes = [0u8; 32];
        let name_slice = name.as_bytes();
        let name_len = name_slice.len().min(32);
        name_bytes[..name_len].copy_from_slice(&name_slice[..name_len]);
        merchant_account.name = name_bytes;

        let mut category_bytes = [0u8; 16];
        let category_slice = category.as_bytes();
        let category_len = category_slice.len().min(16);
        category_bytes[..category_len].copy_from_slice(&category_slice[..category_len]);
        merchant_account.category = category_bytes;

        msg!(
            "Merchant registered: {} ({}), Cashback: {}bps",
            name,
            category,
            cashback_rate
        );

        Ok(())
    }
}

impl<'info> ProcessPurchase<'info> {
    /// Handler for processing purchases and distributing rewards
    pub fn handler(
        ctx: Context<ProcessPurchase>,
        purchase_amount: u64,
        transaction_id: [u8; 32],
    ) -> Result<()> {
        // Validate purchase amount
        require!(purchase_amount > 0, CarsaError::InvalidPurchaseAmount);
        
        // Set maximum purchase amount (1000 SOL in lamports)
        const MAX_PURCHASE_AMOUNT: u64 = 1_000_000_000_000; // 1000 * LAMPORTS_PER_SOL
        require!(purchase_amount <= MAX_PURCHASE_AMOUNT, CarsaError::PurchaseAmountTooLarge);

        let merchant_account = &mut ctx.accounts.merchant_account;
        let config = &mut ctx.accounts.config;
        let transaction_record = &mut ctx.accounts.transaction_record;
        let clock = Clock::get()?;

        // Calculate reward amount based on cashback rate
        // Formula: (purchase_amount * cashback_rate) / 10_000
        // Convert SOL to token units (multiply by 10^9 for token decimals)
        let reward_calculation = (purchase_amount as u128)
            .checked_mul(merchant_account.cashback_rate as u128)
            .ok_or(CarsaError::ArithmeticOverflow)?
            .checked_div(10_000u128)
            .ok_or(CarsaError::ArithmeticOverflow)?
            .checked_mul(1_000_000_000u128) // Convert to token units (9 decimals)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        let reward_amount = u64::try_from(reward_calculation)
            .map_err(|_| CarsaError::ArithmeticOverflow)?;

        // Ensure we're minting at least some tokens (minimum 1 token unit)
        require!(reward_amount > 0, CarsaError::ZeroRewardCalculation);

        // Update merchant statistics with overflow protection
        merchant_account.total_transactions = merchant_account
            .total_transactions
            .checked_add(1)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        merchant_account.total_volume = merchant_account
            .total_volume
            .checked_add(purchase_amount)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        merchant_account.total_rewards_distributed = merchant_account
            .total_rewards_distributed
            .checked_add(reward_amount)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        // Update global configuration with overflow protection
        config.total_supply = config
            .total_supply
            .checked_add(reward_amount)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        // Record the transaction
        transaction_record.customer = ctx.accounts.customer.key();
        transaction_record.merchant = merchant_account.key();
        transaction_record.purchase_amount = purchase_amount;
        transaction_record.reward_amount = reward_amount;
        transaction_record.cashback_rate = merchant_account.cashback_rate;
        transaction_record.timestamp = clock.unix_timestamp;
        transaction_record.transaction_id = transaction_id;
        transaction_record.bump = ctx.bumps.transaction_record;

        // Create signer seeds for CPI call to mint tokens
        let authority_seeds = &[
            MINT_AUTHORITY_SEED,
            &[config.mint_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];

        // Create CPI context for minting reward tokens
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.customer_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Execute the mint operation to distribute rewards
        token::mint_to(cpi_ctx, reward_amount)?;

        msg!(
            "Purchase processed: {} SOL → {} Lokal tokens ({}% cashback)",
            purchase_amount as f64 / 1_000_000_000.0, // Convert lamports to SOL for display
            reward_amount as f64 / 1_000_000_000.0,   // Convert to token units for display
            merchant_account.cashback_rate as f64 / 100.0 // Convert basis points to percentage
        );

        Ok(())
    }
}

impl<'info> UpdateMerchant<'info> {
    /// Handler for updating merchant settings
    pub fn handler(
        ctx: Context<UpdateMerchant>,
        new_cashback_rate: Option<u16>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let merchant_account = &mut ctx.accounts.merchant_account;

        // Update cashback rate if provided
        if let Some(rate) = new_cashback_rate {
            require!(rate <= 10_000, CarsaError::InvalidCashbackRate);
            merchant_account.cashback_rate = rate;
            msg!("Merchant cashback rate updated to: {}bps", rate);
        }

        // Update active status if provided
        if let Some(active) = is_active {
            merchant_account.is_active = active;
            msg!("Merchant active status updated to: {}", active);
        }

        Ok(())
    }
}
