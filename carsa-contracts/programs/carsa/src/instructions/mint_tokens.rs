use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::error::CarsaError;

/// Initialize the Lokal token mint and configuration
/// This instruction creates the SPL token mint and sets up the program as the mint authority
#[derive(Accounts)]
pub struct InitializeLokalMint<'info> {
    /// The authority that can update the mint configuration
    /// This should be the program deployer or designated admin
    #[account(mut)]
    pub update_authority: Signer<'info>,
    
    /// The mint account for Lokal tokens
    /// This will be created and owned by the SPL Token program
    #[account(
        init,
        payer = update_authority,
        mint::decimals = 9, // Standard SPL token decimals
        mint::authority = mint_authority, // PDA as mint authority
        mint::freeze_authority = mint_authority, // PDA can freeze tokens if needed
    )]
    pub mint: Account<'info, Mint>,
    
    /// Program Derived Address that acts as the mint authority
    /// This ensures only the program can mint new tokens
    /// CHECK: This account is derived using seeds and verified in constraints
    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,
    
    /// Configuration account that stores mint metadata and settings
    /// Uses PDA to ensure uniqueness and program ownership
    #[account(
        init,
        payer = update_authority,
        space = LokalMintConfig::LEN,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, LokalMintConfig>,
    
    /// SPL Token program required for mint operations
    pub token_program: Program<'info, Token>,
    
    /// System program required for account creation
    pub system_program: Program<'info, System>,
    
    /// Rent sysvar required for rent exemption calculations
    pub rent: Sysvar<'info, Rent>,
}

/// Mint Lokal tokens to a specified token account
/// This is used for reward distribution when users make purchases
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct MintLokalTokens<'info> {
    /// The authority that can mint tokens (must be the update authority)
    #[account(
        constraint = authority.key() == config.update_authority @ CarsaError::UpdateAuthorityMismatch
    )]
    pub authority: Signer<'info>,
    
    /// The mint account for Lokal tokens
    /// Must match the mint stored in config
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
    
    /// The token account that will receive the minted tokens
    /// This should be the user's associated token account for Lokal tokens
    #[account(
        mut,
        constraint = destination.mint == mint.key()
    )]
    pub destination: Account<'info, TokenAccount>,
    
    /// SPL Token program for mint operations
    pub token_program: Program<'info, Token>,
}

impl<'info> InitializeLokalMint<'info> {
    /// Handler for initializing the Lokal token mint
    pub fn handler(ctx: Context<InitializeLokalMint>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        // Store mint configuration
        config.mint = ctx.accounts.mint.key();
        config.mint_authority_bump = ctx.bumps.mint_authority;
        config.config_bump = ctx.bumps.config;
        config.update_authority = ctx.accounts.update_authority.key();
        config.total_supply = 0;
        
        msg!(
            "Lokal token mint initialized successfully. Mint: {}, Authority: {}",
            config.mint,
            ctx.accounts.mint_authority.key()
        );
        
        Ok(())
    }
}

impl<'info> MintLokalTokens<'info> {
    /// Handler for minting Lokal tokens
    pub fn handler(ctx: Context<MintLokalTokens>, amount: u64) -> Result<()> {
        // Validate mint amount
        require!(amount > 0, CarsaError::InvalidMintAmount);
        
        // Set maximum mint amount per transaction (10,000 tokens with 9 decimals)
        const MAX_MINT_AMOUNT: u64 = 10_000_000_000_000; // 10,000 * 10^9
        require!(amount <= MAX_MINT_AMOUNT, CarsaError::MintAmountTooLarge);
        
        let config = &mut ctx.accounts.config;
        
        // Update total supply with overflow protection
        config.total_supply = config
            .total_supply
            .checked_add(amount)
            .ok_or(CarsaError::ArithmeticOverflow)?;
        
        // Create signer seeds for CPI call
        let authority_seeds = &[
            MINT_AUTHORITY_SEED,
            &[config.mint_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];
        
        // Create CPI context for minting tokens
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        
        // Execute the mint operation
        token::mint_to(cpi_ctx, amount)?;
        
        msg!(
            "Minted {} Lokal tokens to {}. New total supply: {}",
            amount,
            ctx.accounts.destination.key(),
            config.total_supply
        );
        
        Ok(())
    }
}
