use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::*;
use crate::error::CarsaError;

/// Transfer Lokal tokens between user accounts
/// This instruction enables peer-to-peer token transfers within the ecosystem
#[derive(Accounts)]
#[instruction(amount: u64, transaction_id: [u8; 32], memo: String)]
pub struct TransferTokens<'info> {
    /// The sender of the tokens
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// The sender's token account
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key(),
        constraint = sender_token_account.mint == config.mint @ CarsaError::MintAuthorityMismatch
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    /// The recipient's token account
    #[account(
        mut,
        constraint = recipient_token_account.mint == config.mint @ CarsaError::MintAuthorityMismatch,
        constraint = recipient_token_account.key() != sender_token_account.key() @ CarsaError::SelfTransferNotAllowed
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// Configuration account containing mint settings
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.config_bump,
    )]
    pub config: Account<'info, LokalMintConfig>,
    
    /// Transfer record for tracking
    #[account(
        init,
        payer = sender,
        space = TokenTransfer::LEN,
        seeds = [TRANSFER_SEED, sender.key().as_ref(), &transaction_id],
        bump,
    )]
    pub transfer_record: Account<'info, TokenTransfer>,
    
    /// SPL Token program for transfer operations
    pub token_program: Program<'info, Token>,
    
    /// System program required for account creation
    pub system_program: Program<'info, System>,
}

/// Redeem Lokal tokens at a merchant for discounts or payments
/// This instruction handles the spending side of the loyalty program
#[derive(Accounts)]
#[instruction(token_amount: u64, fiat_value: u64, discount_rate: u16, transaction_id: [u8; 32])]
pub struct RedeemTokens<'info> {
    /// The customer redeeming tokens
    #[account(mut)]
    pub customer: Signer<'info>,
    
    /// The customer's token account
    #[account(
        mut,
        constraint = customer_token_account.owner == customer.key(),
        constraint = customer_token_account.mint == config.mint @ CarsaError::MintAuthorityMismatch
    )]
    pub customer_token_account: Account<'info, TokenAccount>,
    
    /// The merchant account where tokens are being redeemed
    #[account(
        mut,
        constraint = merchant_account.is_active @ CarsaError::RedemptionMerchantNotActive
    )]
    pub merchant_account: Account<'info, MerchantAccount>,
    
    /// The merchant's token account (receives the redeemed tokens)
    #[account(
        mut,
        constraint = merchant_token_account.owner == merchant_account.merchant_wallet,
        constraint = merchant_token_account.mint == config.mint @ CarsaError::MintAuthorityMismatch
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    
    /// Configuration account containing mint settings
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.config_bump,
    )]
    pub config: Account<'info, LokalMintConfig>,
    
    /// Redemption record for tracking
    #[account(
        init,
        payer = customer,
        space = TokenRedemption::LEN,
        seeds = [REDEMPTION_SEED, customer.key().as_ref(), merchant_account.key().as_ref(), &transaction_id],
        bump,
    )]
    pub redemption_record: Account<'info, TokenRedemption>,
    
    /// SPL Token program for transfer operations
    pub token_program: Program<'info, Token>,
    
    /// System program required for account creation
    pub system_program: Program<'info, System>,
}

/// Burn redeemed tokens (optional feature for token economy management)
/// This instruction allows merchants to burn tokens they receive from redemptions
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct BurnTokens<'info> {
    /// The merchant burning tokens
    #[account(mut)]
    pub merchant_owner: Signer<'info>,
    
    /// The merchant account
    #[account(
        constraint = merchant_account.merchant_wallet == merchant_owner.key() @ CarsaError::MerchantOwnerMismatch
    )]
    pub merchant_account: Account<'info, MerchantAccount>,
    
    /// The merchant's token account (tokens to be burned)
    #[account(
        mut,
        constraint = merchant_token_account.owner == merchant_owner.key(),
        constraint = merchant_token_account.mint == mint.key()
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    
    /// The Lokal token mint
    #[account(
        mut,
        constraint = mint.key() == config.mint @ CarsaError::MintAuthorityMismatch
    )]
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
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
    
    /// SPL Token program for burn operations
    pub token_program: Program<'info, Token>,
}

impl<'info> TransferTokens<'info> {
    /// Handler for transferring tokens between user accounts
    pub fn handler(
        ctx: Context<TransferTokens>,
        amount: u64,
        transaction_id: [u8; 32],
        memo: String,
    ) -> Result<()> {
        // Validate transfer amount
        require!(amount > 0, CarsaError::InvalidTransferAmount);
        
        // Set maximum transfer amount (10,000 tokens with 9 decimals)
        const MAX_TRANSFER_AMOUNT: u64 = 10_000_000_000_000; // 10,000 * 10^9
        require!(amount <= MAX_TRANSFER_AMOUNT, CarsaError::TransferAmountTooLarge);
        
        // Validate memo length
        require!(memo.len() <= 64, CarsaError::InvalidMerchantName);
        
        let transfer_record = &mut ctx.accounts.transfer_record;
        let clock = Clock::get()?;

        // Check sender has sufficient balance
        require!(
            ctx.accounts.sender_token_account.amount >= amount,
            CarsaError::InsufficientBalance
        );

        // Record the transfer details
        transfer_record.from = ctx.accounts.sender.key();
        transfer_record.to = ctx.accounts.recipient_token_account.owner;
        transfer_record.amount = amount;
        transfer_record.timestamp = clock.unix_timestamp;
        transfer_record.transaction_id = transaction_id;
        transfer_record.bump = ctx.bumps.transfer_record;

        // Convert memo to fixed-size byte array
        let mut memo_bytes = [0u8; 64];
        let memo_slice = memo.as_bytes();
        let memo_len = memo_slice.len().min(64);
        memo_bytes[..memo_len].copy_from_slice(&memo_slice[..memo_len]);
        transfer_record.memo = memo_bytes;

        // Create CPI context for token transfer
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute the transfer
        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Token transfer: {} tokens from {} to {}",
            amount as f64 / 1_000_000_000.0, // Convert to display units
            ctx.accounts.sender.key(),
            ctx.accounts.recipient_token_account.owner
        );

        Ok(())
    }
}

impl<'info> RedeemTokens<'info> {
    /// Handler for redeeming tokens at merchants
    pub fn handler(
        ctx: Context<RedeemTokens>,
        token_amount: u64,
        fiat_value: u64,
        discount_rate: u16,
        transaction_id: [u8; 32],
    ) -> Result<()> {
        // Validate redemption amount
        require!(token_amount > 0, CarsaError::InvalidRedemptionAmount);
        require!(fiat_value > 0, CarsaError::InvalidPurchaseAmount);
        
        // Set maximum redemption amount (5,000 tokens with 9 decimals)
        const MAX_REDEMPTION_AMOUNT: u64 = 5_000_000_000_000; // 5,000 * 10^9
        require!(token_amount <= MAX_REDEMPTION_AMOUNT, CarsaError::RedemptionAmountTooLarge);
        
        // Validate discount rate (0-100%)
        require!(discount_rate <= 10_000, CarsaError::InvalidDiscountPercentage);

        let merchant_account = &mut ctx.accounts.merchant_account;
        let redemption_record = &mut ctx.accounts.redemption_record;
        let clock = Clock::get()?;

        // Check customer has sufficient balance
        require!(
            ctx.accounts.customer_token_account.amount >= token_amount,
            CarsaError::InsufficientBalance
        );

        // Update merchant statistics with overflow protection
        merchant_account.total_transactions = merchant_account
            .total_transactions
            .checked_add(1)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        merchant_account.total_volume = merchant_account
            .total_volume
            .checked_add(fiat_value)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        // Record the redemption details
        redemption_record.customer = ctx.accounts.customer.key();
        redemption_record.merchant = merchant_account.key();
        redemption_record.token_amount = token_amount;
        redemption_record.fiat_value = fiat_value;
        redemption_record.discount_rate = discount_rate;
        redemption_record.timestamp = clock.unix_timestamp;
        redemption_record.transaction_id = transaction_id;
        redemption_record.bump = ctx.bumps.redemption_record;

        // Create CPI context for token transfer from customer to merchant
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.customer_token_account.to_account_info(),
            to: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.customer.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute the token transfer (customer -> merchant)
        token::transfer(cpi_ctx, token_amount)?;

        msg!(
            "Token redemption: {} tokens (${:.2} value) at merchant {} with {}% discount",
            token_amount as f64 / 1_000_000_000.0, // Convert to display units
            fiat_value as f64 / 1_000_000_000.0,   // Convert lamports to SOL equivalent for display
            merchant_account.key(),
            discount_rate as f64 / 100.0 // Convert basis points to percentage
        );

        Ok(())
    }
}

impl<'info> BurnTokens<'info> {
    /// Handler for burning tokens (optional deflation mechanism)
    pub fn handler(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        // Validate burn amount
        require!(amount > 0, CarsaError::InvalidMintAmount);
        
        // Check merchant has sufficient balance
        require!(
            ctx.accounts.merchant_token_account.amount >= amount,
            CarsaError::InsufficientBalance
        );

        let config = &mut ctx.accounts.config;

        // Update total supply (reduce by burned amount)
        config.total_supply = config
            .total_supply
            .checked_sub(amount)
            .ok_or(CarsaError::ArithmeticOverflow)?;

        // Create CPI context for burning tokens
        // Use the merchant owner as authority since they own the token account
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.merchant_owner.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute the burn operation
        token::burn(cpi_ctx, amount)?;

        msg!(
            "Burned {} tokens. New total supply: {}",
            amount as f64 / 1_000_000_000.0,
            config.total_supply as f64 / 1_000_000_000.0
        );

        Ok(())
    }
}
