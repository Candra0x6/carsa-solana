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
    
    /// Total purchase volume (in SOL lamports) processed
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
/// This account stores details of each purchase transaction
#[account]
pub struct PurchaseTransaction {
    /// The customer's wallet public key
    pub customer: Pubkey,
    
    /// The merchant's account public key
    pub merchant: Pubkey,
    
    /// Purchase amount in SOL lamports
    pub purchase_amount: u64,
    
    /// Reward tokens minted for this purchase
    pub reward_amount: u64,
    
    /// Cashback rate applied (in basis points)
    pub cashback_rate: u16,
    
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
    /// 8 (discriminator) + 32 (customer) + 32 (merchant) + 8 (purchase_amount) + 8 (reward_amount)
    /// + 2 (cashback_rate) + 8 (timestamp) + 32 (transaction_id) + 1 (bump) + 16 (reserved) = 147 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 2 + 8 + 32 + 1 + 16;
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
    
    /// Fiat value of the redemption (in lamports for calculation)
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
