use anchor_lang::prelude::*;

/// Custom error codes for the Carsa program
#[error_code]
pub enum CarsaError {
    #[msg("Mint authority mismatch - the provided mint authority does not match the expected PDA")]
    MintAuthorityMismatch,
    
    #[msg("Update authority mismatch - only the designated update authority can perform this action")]
    UpdateAuthorityMismatch,
    
    #[msg("Mint amount cannot be zero")]
    InvalidMintAmount,
    
    #[msg("Mint amount exceeds maximum allowed per transaction")]
    MintAmountTooLarge,
    
    #[msg("Arithmetic overflow occurred during calculation")]
    ArithmeticOverflow,
    
    #[msg("The Lokal token mint has not been initialized")]
    MintNotInitialized,
    
    #[msg("Purchase amount cannot be zero")]
    InvalidPurchaseAmount,
    
    #[msg("Purchase amount exceeds maximum allowed per transaction")]
    PurchaseAmountTooLarge,
    
    #[msg("Merchant is not active or has been deactivated")]
    MerchantNotActive,
    
    #[msg("Invalid cashback rate - must be between 0 and 10000 basis points")]
    InvalidCashbackRate,
    
    #[msg("Merchant name is too long or contains invalid characters")]
    InvalidMerchantName,
    
    #[msg("Merchant category is invalid or not supported")]
    InvalidMerchantCategory,
    
    #[msg("Only the merchant owner can perform this action")]
    MerchantOwnerMismatch,
    
    #[msg("Reward calculation resulted in zero tokens")]
    ZeroRewardCalculation,
    
    #[msg("Transfer amount cannot be zero")]
    InvalidTransferAmount,
    
    #[msg("Transfer amount exceeds maximum allowed per transaction")]
    TransferAmountTooLarge,
    
    #[msg("Insufficient token balance for transfer")]
    InsufficientBalance,
    
    #[msg("Redemption amount cannot be zero")]
    InvalidRedemptionAmount,
    
    #[msg("Redemption amount exceeds maximum allowed per transaction")]
    RedemptionAmountTooLarge,
    
    #[msg("Cannot transfer to the same account")]
    SelfTransferNotAllowed,
    
    #[msg("Redemption not allowed - merchant must be active")]
    RedemptionMerchantNotActive,
    
    #[msg("Invalid discount percentage - must be between 0 and 100")]
    InvalidDiscountPercentage,
    
    // Voucher Pool Errors
    #[msg("Invalid amount - must be greater than zero and within limits")]
    InvalidAmount,
    
    #[msg("Unauthorized - only the pool authority can perform this action")]
    Unauthorized,
    
    #[msg("Unauthorized delegate - only the pool delegate can perform this action")]
    UnauthorizedDelegate,
    
    #[msg("Deposits are currently disabled for this pool")]
    DepositsDisabled,
    
    #[msg("Withdrawals are currently disabled for this pool")]
    WithdrawalsDisabled,
    
    #[msg("User has exceeded the maximum stake per user limit")]
    ExceedsMaxStake,
    
    #[msg("Invalid vault account")]
    InvalidVault,
    
    #[msg("Invalid mint account")]
    InvalidMint,
    
    #[msg("Invalid owner - account owner does not match expected value")]
    InvalidOwner,
    
    #[msg("Arithmetic overflow occurred")]
    Overflow,
    
    #[msg("Division by zero attempted")]
    DivisionByZero,
}
