use anchor_lang::prelude::*;

/// State account that stores the configuration and metadata for the Lokal token mint
/// This account is owned by the program and stores essential mint information
#[account]
pub struct LokalMintConfig {
    /// The public key of the mint account for Lokal tokens
    pub mint: Pubkey,
    
    /// The bump seed for the PDA that acts as mint authority
    /// This ensures the program has full control over token minting
    pub mint_authority_bump: u8,
    
    /// The bump seed for this config account's PDA
    pub config_bump: u8,
    
    /// The authority that can update mint configuration (typically program deployer)
    pub update_authority: Pubkey,
    
    /// Total supply of Lokal tokens ever minted
    /// Used for tracking and analytics purposes
    pub total_supply: u64,
    
    /// Reserved space for future upgrades (64 bytes)
    pub reserved: [u8; 64],
}

impl LokalMintConfig {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (mint) + 1 (mint_authority_bump) + 1 (config_bump) 
    /// + 32 (update_authority) + 8 (total_supply) + 64 (reserved) = 146 bytes
    pub const LEN: usize = 8 + 32 + 1 + 1 + 32 + 8 + 64;
}

/// Merchant account that stores merchant-specific information and settings
/// This account tracks participating merchants and their reward configurations
#[account]
pub struct MerchantAccount {
    /// The merchant's wallet public key for receiving payments
    pub merchant_wallet: Pubkey,
    
    /// The merchant's display name
    pub name: [u8; 32], // Fixed size for efficient storage
    
    /// The merchant's category (e.g., "restaurant", "bookstore", "coffee_shop")
    pub category: [u8; 16],
    
    /// Cashback percentage (in basis points, e.g., 500 = 5%)
    pub cashback_rate: u16,
    
    /// Whether the merchant is currently active
    pub is_active: bool,
    
    /// Total number of transactions processed for this merchant
    pub total_transactions: u64,
    
    /// Total amount of tokens distributed as rewards for this merchant
    pub total_rewards_distributed: u64,
    
    /// Total purchase volume (in Indonesian Rupiah IDR) processed
    pub total_volume: u64,
    
    /// Timestamp when merchant was registered
    pub created_at: i64,
    
    /// The bump seed for this merchant account's PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (32 bytes)
    pub reserved: [u8; 32],
}

impl MerchantAccount {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (merchant_wallet) + 32 (name) + 16 (category) + 2 (cashback_rate)
    /// + 1 (is_active) + 8 (total_transactions) + 8 (total_rewards_distributed) + 8 (total_volume)
    /// + 8 (created_at) + 1 (bump) + 32 (reserved) = 156 bytes
    pub const LEN: usize = 8 + 32 + 32 + 16 + 2 + 1 + 8 + 8 + 8 + 8 + 1 + 32;
}

/// Purchase transaction record for tracking and analytics
/// This account stores details of each purchase transaction including token redemptions
#[account]
pub struct PurchaseTransaction {
    /// The customer's wallet public key
    pub customer: Pubkey,
    
    /// The merchant's account public key
    pub merchant: Pubkey,
    
    /// Fiat purchase amount in Indonesian Rupiah (IDR)
    pub fiat_amount: u64,
    
    /// Amount of tokens redeemed as payment (0 if none)
    pub redeemed_token_amount: u64,
    
    /// Total transaction value (fiat + token value in IDR)
    pub total_value: u64,
    
    /// Reward tokens minted for this purchase
    pub reward_amount: u64,
    
    /// Cashback rate applied (in basis points)
    pub cashback_rate: u16,
    
    /// Whether tokens were used in this transaction
    pub used_tokens: bool,
    
    /// Timestamp of the transaction
    pub timestamp: i64,
    
    /// Transaction signature for reference
    pub transaction_id: [u8; 32],
    
    /// The bump seed for this transaction account's PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (16 bytes)
    pub reserved: [u8; 16],
}

impl PurchaseTransaction {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (customer) + 32 (merchant) + 8 (fiat_amount) + 8 (redeemed_token_amount)
    /// + 8 (total_value) + 8 (reward_amount) + 2 (cashback_rate) + 1 (used_tokens) + 8 (timestamp) 
    /// + 32 (transaction_id) + 1 (bump) + 16 (reserved) = 164 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 2 + 1 + 8 + 32 + 1 + 16;
}

/// Token transfer record for tracking P2P transfers
/// This account stores details of token transfers between users
#[account]
pub struct TokenTransfer {
    /// The sender's public key
    pub from: Pubkey,
    
    /// The recipient's public key
    pub to: Pubkey,
    
    /// Amount of tokens transferred
    pub amount: u64,
    
    /// Timestamp of the transfer
    pub timestamp: i64,
    
    /// Transfer transaction signature for reference
    pub transaction_id: [u8; 32],
    
    /// Optional memo/note for the transfer
    pub memo: [u8; 64],
    
    /// The bump seed for this transfer account's PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (16 bytes)
    pub reserved: [u8; 16],
}

impl TokenTransfer {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (from) + 32 (to) + 8 (amount) + 8 (timestamp)
    /// + 32 (transaction_id) + 64 (memo) + 1 (bump) + 16 (reserved) = 201 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 32 + 64 + 1 + 16;
}

/// Token redemption record for tracking spending at merchants
/// This account stores details when customers spend Lokal tokens at merchants
#[account]
pub struct TokenRedemption {
    /// The customer who redeemed tokens
    pub customer: Pubkey,
    
    /// The merchant where tokens were redeemed
    pub merchant: Pubkey,
    
    /// Amount of tokens redeemed
    pub token_amount: u64,
    
    /// Fiat value of the redemption (in Indonesian Rupiah IDR)
    pub fiat_value: u64,
    
    /// Discount percentage applied (in basis points)
    pub discount_rate: u16,
    
    /// Timestamp of the redemption
    pub timestamp: i64,
    
    /// Redemption transaction signature for reference
    pub transaction_id: [u8; 32],
    
    /// The bump seed for this redemption account's PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (32 bytes)
    pub reserved: [u8; 32],
}

impl TokenRedemption {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (customer) + 32 (merchant) + 8 (token_amount) + 8 (fiat_value)
    /// + 2 (discount_rate) + 8 (timestamp) + 32 (transaction_id) + 1 (bump) + 32 (reserved) = 163 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 2 + 8 + 32 + 1 + 32;
}

/// Seeds for deriving the mint authority PDA
pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";

/// Seeds for deriving the config account PDA  
pub const CONFIG_SEED: &[u8] = b"config";

/// Seeds for deriving merchant account PDAs
pub const MERCHANT_SEED: &[u8] = b"merchant";

/// Seeds for deriving purchase transaction PDAs
pub const TRANSACTION_SEED: &[u8] = b"transaction";

/// Seeds for deriving token transfer PDAs
pub const TRANSFER_SEED: &[u8] = b"transfer";

/// Seeds for deriving token redemption PDAs
pub const REDEMPTION_SEED: &[u8] = b"redemption";

// ============================================================================
// Voucher Pool State Structures for Non-Custodial Staking
// ============================================================================

/// Configuration parameters for the voucher staking pool
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct PoolConfig {
    /// Minimum amount required to stake
    pub min_stake_amount: u64,
    
    /// Maximum amount that can be staked per user
    pub max_stake_per_user: u64,
    
    /// Whether the pool accepts new deposits
    pub deposits_enabled: bool,
    
    /// Whether users can withdraw/redeem
    pub withdrawals_enabled: bool,
    
    /// Annual percentage yield (in basis points, e.g., 1200 = 12%)
    pub apy_basis_points: u16,
}

/// Main pool state account for voucher staking
/// Tracks overall pool metrics and configuration
#[account]
pub struct PoolState {
    /// The authority that can manage the pool (admin)
    pub pool_authority: Pubkey,
    
    /// The delegate authority that can execute deposits on behalf of users
    pub pool_delegate: Pubkey,
    
    /// The vault token account that holds staked voucher tokens
    pub vault_ata: Pubkey,
    
    /// The mint address of the voucher token (LOKAL token)
    pub voucher_mint: Pubkey,
    
    /// Pool configuration parameters
    pub config: PoolConfig,
    
    /// Total amount of voucher tokens currently staked in the pool
    pub total_voucher_staked: u64,
    
    /// Total SOL/WSOL staked (after swaps)
    pub total_sol_staked: u64,
    
    /// Total yield earned (in SOL/WSOL)
    pub total_yield_earned: u64,
    
    /// Number of unique stakers
    pub total_stakers: u64,
    
    /// Reward index for calculating proportional yields
    pub reward_index: u128,
    
    /// Timestamp when pool was created
    pub created_at: i64,
    
    /// Timestamp of last yield update
    pub last_yield_update: i64,
    
    /// The bump seed for this pool state PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (64 bytes)
    pub reserved: [u8; 64],
}

impl PoolState {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (pool_authority) + 32 (pool_delegate) + 32 (vault_ata)
    /// + 32 (voucher_mint) + (8 + 8 + 1 + 1 + 2) PoolConfig + 8 (total_voucher_staked)
    /// + 8 (total_sol_staked) + 8 (total_yield_earned) + 8 (total_stakers)
    /// + 16 (reward_index) + 8 (created_at) + 8 (last_yield_update) + 1 (bump) + 64 (reserved)
    /// = 284 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 20 + 8 + 8 + 8 + 8 + 16 + 8 + 8 + 1 + 64;
}

/// Individual user stake record
/// Tracks each user's staking position and rewards
#[account]
pub struct UserStakeRecord {
    /// The user who owns this stake
    pub user: Pubkey,
    
    /// The pool this stake belongs to
    pub pool: Pubkey,
    
    /// Amount of voucher tokens staked by this user
    pub staked_amount: u64,
    
    /// User's reward index snapshot (for yield calculations)
    pub user_reward_index: u128,
    
    /// Total yield claimed by this user
    pub total_yield_claimed: u64,
    
    /// Timestamp when user first staked
    pub staked_at: i64,
    
    /// Timestamp of last stake/unstake action
    pub last_action_at: i64,
    
    /// The bump seed for this user stake record PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades (32 bytes)
    pub reserved: [u8; 32],
}

impl UserStakeRecord {
    /// Calculate the space needed for this account
    /// 8 (discriminator) + 32 (user) + 32 (pool) + 8 (staked_amount)
    /// + 16 (user_reward_index) + 8 (total_yield_claimed) + 8 (staked_at)
    /// + 8 (last_action_at) + 1 (bump) + 32 (reserved) = 153 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 16 + 8 + 8 + 8 + 1 + 32;
}

/// Seeds for deriving the pool state PDA
pub const POOL_STATE_SEED: &[u8] = b"pool_state";

/// Seeds for deriving the pool vault authority PDA
pub const POOL_VAULT_AUTHORITY_SEED: &[u8] = b"pool_vault_authority";

/// Seeds for deriving user stake record PDAs
pub const USER_STAKE_SEED: &[u8] = b"user_stake";
