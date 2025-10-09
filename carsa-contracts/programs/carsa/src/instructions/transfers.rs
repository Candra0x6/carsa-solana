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

// NOTE: RedeemTokens and BurnTokens functionality has been integrated into ProcessPurchase
// Token redemption is now handled as an optional parameter in ProcessPurchase
// This provides a unified transaction experience

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

// NOTE: RedeemTokens and BurnTokens implementation handlers have been removed
// Their functionality is now integrated into the ProcessPurchase instruction
