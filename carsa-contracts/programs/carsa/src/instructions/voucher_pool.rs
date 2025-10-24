use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::*;
use crate::state::*;

// ============================================================================
// Initialize Pool Instruction
// ============================================================================

/// Initialize a new voucher staking pool
/// This creates the pool state and sets up the vault for holding staked tokens
#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// The authority that manages the pool (admin)
    #[account(mut)]
    pub pool_authority: Signer<'info>,

    /// The delegate authority that can execute deposits on behalf of users
    /// CHECK: This is validated by storing it in the pool state
    pub pool_delegate: AccountInfo<'info>,

    /// The pool state account (PDA)
    #[account(
        init,
        payer = pool_authority,
        space = PoolState::LEN,
        seeds = [POOL_STATE_SEED],
        bump
    )]
    pub pool_state: Account<'info, PoolState>,

    /// The vault token account that will hold staked voucher tokens
    /// Must be initialized before calling this instruction
    #[account(
        mut,
        constraint = vault_ata.mint == voucher_mint.key() @ CarsaError::InvalidMint,
        constraint = vault_ata.owner == pool_vault_authority.key() @ CarsaError::InvalidOwner
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    /// The vault authority PDA (owns the vault_ata)
    /// CHECK: PDA validation is handled by seeds constraint
    #[account(
        seeds = [POOL_VAULT_AUTHORITY_SEED],
        bump
    )]
    pub pool_vault_authority: AccountInfo<'info>,

    /// The voucher token mint (LOKAL token)
    pub voucher_mint: Account<'info, Mint>,

    /// System program for account creation
    pub system_program: Program<'info, System>,

    /// Token program for SPL token operations
    pub token_program: Program<'info, Token>,
}

impl InitializePool<'_> {
    pub fn handler(ctx: Context<InitializePool>, config: PoolConfig) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        let clock = Clock::get()?;

        // Validate configuration
        require!(
            config.min_stake_amount > 0,
            CarsaError::InvalidAmount
        );
        require!(
            config.max_stake_per_user >= config.min_stake_amount,
            CarsaError::InvalidAmount
        );
        require!(
            config.apy_basis_points <= 10000, // Max 100% APY
            CarsaError::InvalidAmount
        );

        // Initialize pool state
        pool_state.pool_authority = ctx.accounts.pool_authority.key();
        pool_state.pool_delegate = ctx.accounts.pool_delegate.key();
        pool_state.vault_ata = ctx.accounts.vault_ata.key();
        pool_state.voucher_mint = ctx.accounts.voucher_mint.key();
        pool_state.config = config;
        pool_state.total_voucher_staked = 0;
        pool_state.total_sol_staked = 0;
        pool_state.total_yield_earned = 0;
        pool_state.total_stakers = 0;
        pool_state.reward_index = 0;
        pool_state.created_at = clock.unix_timestamp;
        pool_state.last_yield_update = clock.unix_timestamp;
        pool_state.bump = ctx.bumps.pool_state;

        msg!("Voucher pool initialized successfully");
        msg!("Pool Authority: {}", pool_state.pool_authority);
        msg!("Pool Delegate: {}", pool_state.pool_delegate);
        msg!("Vault ATA: {}", pool_state.vault_ata);
        msg!("Min Stake: {}", pool_state.config.min_stake_amount);

        // Emit event
        emit!(PoolInitializedEvent {
            pool_authority: pool_state.pool_authority,
            pool_delegate: pool_state.pool_delegate,
            vault_ata: pool_state.vault_ata,
            voucher_mint: pool_state.voucher_mint,
            min_stake_amount: pool_state.config.min_stake_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Deposit Voucher Instruction
// ============================================================================

/// Deposit voucher tokens into the staking pool
/// Uses delegated authority (user has pre-approved the pool delegate)
#[derive(Accounts)]
pub struct DepositVoucher<'info> {
    /// The user whose tokens are being deposited
    /// CHECK: We validate ownership through the token account
    pub user: AccountInfo<'info>,

    /// The delegate authority executing this instruction on behalf of the user
    /// Must match the pool_delegate in pool_state
    #[account(mut)]
    pub pool_delegate: Signer<'info>,

    /// The pool state account
    #[account(
        mut,
        seeds = [POOL_STATE_SEED],
        bump = pool_state.bump,
        constraint = pool_delegate.key() == pool_state.pool_delegate @ CarsaError::UnauthorizedDelegate,
        constraint = pool_state.config.deposits_enabled @ CarsaError::DepositsDisabled
    )]
    pub pool_state: Account<'info, PoolState>,

    /// User's stake record (created if doesn't exist)
    #[account(
        init_if_needed,
        payer = pool_delegate,
        space = UserStakeRecord::LEN,
        seeds = [USER_STAKE_SEED, pool_state.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake_record: Account<'info, UserStakeRecord>,

    /// User's voucher token account (source)
    #[account(
        mut,
        constraint = user_voucher_ata.mint == pool_state.voucher_mint @ CarsaError::InvalidMint,
        constraint = user_voucher_ata.owner == user.key() @ CarsaError::InvalidOwner
    )]
    pub user_voucher_ata: Account<'info, TokenAccount>,

    /// Pool vault token account (destination)
    #[account(
        mut,
        constraint = pool_vault_ata.key() == pool_state.vault_ata @ CarsaError::InvalidVault
    )]
    pub pool_vault_ata: Account<'info, TokenAccount>,

    /// System program for account creation
    pub system_program: Program<'info, System>,

    /// Token program for SPL token operations
    pub token_program: Program<'info, Token>,
}

impl DepositVoucher<'_> {
    pub fn handler(ctx: Context<DepositVoucher>, amount: u64) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        let user_stake_record = &mut ctx.accounts.user_stake_record;
        let clock = Clock::get()?;

        // Validate amount
        require!(amount > 0, CarsaError::InvalidAmount);
        require!(
            amount >= pool_state.config.min_stake_amount,
            CarsaError::InvalidAmount
        );

        // Check user hasn't exceeded max stake
        let new_user_total = user_stake_record
            .staked_amount
            .checked_add(amount)
            .ok_or(CarsaError::Overflow)?;
        require!(
            new_user_total <= pool_state.config.max_stake_per_user,
            CarsaError::ExceedsMaxStake
        );

        // Initialize user stake record if this is their first stake
        if user_stake_record.staked_amount == 0 {
            user_stake_record.user = ctx.accounts.user.key();
            user_stake_record.pool = pool_state.key();
            user_stake_record.user_reward_index = pool_state.reward_index;
            user_stake_record.total_yield_claimed = 0;
            user_stake_record.staked_at = clock.unix_timestamp;
            user_stake_record.bump = ctx.bumps.user_stake_record;
            
            pool_state.total_stakers = pool_state
                .total_stakers
                .checked_add(1)
                .ok_or(CarsaError::Overflow)?;
        }

        // Transfer tokens from user to vault using delegated authority
        // The user must have already approved the pool_delegate
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_voucher_ata.to_account_info(),
                to: ctx.accounts.pool_vault_ata.to_account_info(),
                authority: ctx.accounts.pool_delegate.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Update pool state
        pool_state.total_voucher_staked = pool_state
            .total_voucher_staked
            .checked_add(amount)
            .ok_or(CarsaError::Overflow)?;

        // Update user stake record
        user_stake_record.staked_amount = new_user_total;
        user_stake_record.last_action_at = clock.unix_timestamp;

        msg!("Voucher deposited successfully");
        msg!("User: {}", ctx.accounts.user.key());
        msg!("Amount: {}", amount);
        msg!("New user total: {}", new_user_total);
        msg!("Pool total staked: {}", pool_state.total_voucher_staked);

        // Emit event
        emit!(VoucherDepositedEvent {
            user: ctx.accounts.user.key(),
            pool: pool_state.key(),
            amount,
            new_user_total,
            pool_total_staked: pool_state.total_voucher_staked,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Record Yield Instruction
// ============================================================================

/// Record yield earned from staking activities
/// Called by backend after swapping vouchers to SOL and earning yield
#[derive(Accounts)]
pub struct RecordYield<'info> {
    /// The pool delegate authority (backend service)
    pub pool_delegate: Signer<'info>,

    /// The pool state account
    #[account(
        mut,
        seeds = [POOL_STATE_SEED],
        bump = pool_state.bump,
        constraint = pool_delegate.key() == pool_state.pool_delegate @ CarsaError::UnauthorizedDelegate
    )]
    pub pool_state: Account<'info, PoolState>,
}

impl RecordYield<'_> {
    pub fn handler(ctx: Context<RecordYield>, sol_amount: u64) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        let clock = Clock::get()?;

        require!(sol_amount > 0, CarsaError::InvalidAmount);

        // Update yield tracking
        pool_state.total_sol_staked = pool_state
            .total_sol_staked
            .checked_add(sol_amount)
            .ok_or(CarsaError::Overflow)?;

        pool_state.total_yield_earned = pool_state
            .total_yield_earned
            .checked_add(sol_amount)
            .ok_or(CarsaError::Overflow)?;

        // Update reward index for proportional yield distribution
        if pool_state.total_voucher_staked > 0 {
            let yield_per_token = (sol_amount as u128)
                .checked_mul(1_000_000_000_000) // Scale factor for precision
                .ok_or(CarsaError::Overflow)?
                .checked_div(pool_state.total_voucher_staked as u128)
                .ok_or(CarsaError::DivisionByZero)?;

            pool_state.reward_index = pool_state
                .reward_index
                .checked_add(yield_per_token)
                .ok_or(CarsaError::Overflow)?;
        }

        pool_state.last_yield_update = clock.unix_timestamp;

        msg!("Yield recorded successfully");
        msg!("SOL amount: {}", sol_amount);
        msg!("Total yield earned: {}", pool_state.total_yield_earned);
        msg!("New reward index: {}", pool_state.reward_index);

        // Emit event
        emit!(YieldRecordedEvent {
            pool: pool_state.key(),
            sol_amount,
            total_yield_earned: pool_state.total_yield_earned,
            reward_index: pool_state.reward_index,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Redeem Voucher Instruction
// ============================================================================

/// Redeem staked vouchers and claim yield
/// Allows users to unstake and withdraw their tokens plus earned yield
#[derive(Accounts)]
pub struct RedeemVoucher<'info> {
    /// The user redeeming their stake
    #[account(mut)]
    pub user: Signer<'info>,

    /// The pool state account
    #[account(
        mut,
        seeds = [POOL_STATE_SEED],
        bump = pool_state.bump,
        constraint = pool_state.config.withdrawals_enabled @ CarsaError::WithdrawalsDisabled
    )]
    pub pool_state: Account<'info, PoolState>,

    /// User's stake record
    #[account(
        mut,
        seeds = [USER_STAKE_SEED, pool_state.key().as_ref(), user.key().as_ref()],
        bump = user_stake_record.bump,
        constraint = user_stake_record.user == user.key() @ CarsaError::InvalidOwner
    )]
    pub user_stake_record: Account<'info, UserStakeRecord>,

    /// User's voucher token account (destination)
    #[account(
        mut,
        constraint = user_voucher_ata.mint == pool_state.voucher_mint @ CarsaError::InvalidMint,
        constraint = user_voucher_ata.owner == user.key() @ CarsaError::InvalidOwner
    )]
    pub user_voucher_ata: Account<'info, TokenAccount>,

    /// Pool vault token account (source)
    #[account(
        mut,
        constraint = pool_vault_ata.key() == pool_state.vault_ata @ CarsaError::InvalidVault
    )]
    pub pool_vault_ata: Account<'info, TokenAccount>,

    /// Pool vault authority PDA (signer for transfer)
    /// CHECK: PDA validation is handled by seeds constraint
    #[account(
        seeds = [POOL_VAULT_AUTHORITY_SEED],
        bump
    )]
    pub pool_vault_authority: AccountInfo<'info>,

    /// Token program for SPL token operations
    pub token_program: Program<'info, Token>,
}

impl RedeemVoucher<'_> {
    pub fn handler(ctx: Context<RedeemVoucher>, amount: u64) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        let user_stake_record = &mut ctx.accounts.user_stake_record;
        let clock = Clock::get()?;

        // Validate amount
        require!(amount > 0, CarsaError::InvalidAmount);
        require!(
            amount <= user_stake_record.staked_amount,
            CarsaError::InsufficientBalance
        );

        // Calculate claimable yield based on reward index difference
        let reward_index_diff = pool_state
            .reward_index
            .checked_sub(user_stake_record.user_reward_index)
            .ok_or(CarsaError::Overflow)?;

        let claimable_yield = (user_stake_record.staked_amount as u128)
            .checked_mul(reward_index_diff)
            .ok_or(CarsaError::Overflow)?
            .checked_div(1_000_000_000_000) // Undo scale factor
            .ok_or(CarsaError::DivisionByZero)? as u64;

        // Transfer voucher tokens back to user
        let vault_authority_bump = ctx.bumps.pool_vault_authority;
        let vault_authority_seeds = &[POOL_VAULT_AUTHORITY_SEED, &[vault_authority_bump]];
        let signer_seeds = &[&vault_authority_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault_ata.to_account_info(),
                to: ctx.accounts.user_voucher_ata.to_account_info(),
                authority: ctx.accounts.pool_vault_authority.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        // Update pool state
        pool_state.total_voucher_staked = pool_state
            .total_voucher_staked
            .checked_sub(amount)
            .ok_or(CarsaError::Overflow)?;

        // Update user stake record
        user_stake_record.staked_amount = user_stake_record
            .staked_amount
            .checked_sub(amount)
            .ok_or(CarsaError::Overflow)?;

        user_stake_record.user_reward_index = pool_state.reward_index;
        user_stake_record.total_yield_claimed = user_stake_record
            .total_yield_claimed
            .checked_add(claimable_yield)
            .ok_or(CarsaError::Overflow)?;

        user_stake_record.last_action_at = clock.unix_timestamp;

        // If user has fully withdrawn, decrement staker count
        if user_stake_record.staked_amount == 0 {
            pool_state.total_stakers = pool_state
                .total_stakers
                .checked_sub(1)
                .ok_or(CarsaError::Overflow)?;
        }

        msg!("Voucher redeemed successfully");
        msg!("User: {}", ctx.accounts.user.key());
        msg!("Amount redeemed: {}", amount);
        msg!("Yield claimed: {}", claimable_yield);
        msg!("Remaining stake: {}", user_stake_record.staked_amount);

        // Emit event
        emit!(VoucherRedeemedEvent {
            user: ctx.accounts.user.key(),
            pool: pool_state.key(),
            amount_redeemed: amount,
            yield_claimed: claimable_yield,
            remaining_stake: user_stake_record.staked_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Update Pool Config Instruction
// ============================================================================

/// Update pool configuration settings
/// Only the pool authority can perform this operation
#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    /// The pool authority (admin)
    pub pool_authority: Signer<'info>,

    /// The pool state account
    #[account(
        mut,
        seeds = [POOL_STATE_SEED],
        bump = pool_state.bump,
        constraint = pool_authority.key() == pool_state.pool_authority @ CarsaError::Unauthorized
    )]
    pub pool_state: Account<'info, PoolState>,
}

impl UpdatePoolConfig<'_> {
    pub fn handler(ctx: Context<UpdatePoolConfig>, new_config: PoolConfig) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        let clock = Clock::get()?;

        // Validate new configuration
        require!(
            new_config.min_stake_amount > 0,
            CarsaError::InvalidAmount
        );
        require!(
            new_config.max_stake_per_user >= new_config.min_stake_amount,
            CarsaError::InvalidAmount
        );
        require!(
            new_config.apy_basis_points <= 10000,
            CarsaError::InvalidAmount
        );

        pool_state.config = new_config;

        msg!("Pool configuration updated");
        msg!("Deposits enabled: {}", pool_state.config.deposits_enabled);
        msg!("Withdrawals enabled: {}", pool_state.config.withdrawals_enabled);

        // Emit event
        emit!(PoolConfigUpdatedEvent {
            pool: pool_state.key(),
            config: new_config,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PoolInitializedEvent {
    pub pool_authority: Pubkey,
    pub pool_delegate: Pubkey,
    pub vault_ata: Pubkey,
    pub voucher_mint: Pubkey,
    pub min_stake_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VoucherDepositedEvent {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub new_user_total: u64,
    pub pool_total_staked: u64,
    pub timestamp: i64,
}

#[event]
pub struct YieldRecordedEvent {
    pub pool: Pubkey,
    pub sol_amount: u64,
    pub total_yield_earned: u64,
    pub reward_index: u128,
    pub timestamp: i64,
}

#[event]
pub struct VoucherRedeemedEvent {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount_redeemed: u64,
    pub yield_claimed: u64,
    pub remaining_stake: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolConfigUpdatedEvent {
    pub pool: Pubkey,
    pub config: PoolConfig,
    pub timestamp: i64,
}
