/**
 * Voucher Pool Client - TypeScript Examples
 * 
 * This file demonstrates how to interact with the voucher pool program
 * for non-custodial staking of LOKAL tokens.
 * 
 * Features:
 * - Initialize staking pool
 * - Deposit vouchers using delegated authority
 * - Record yield
 * - Redeem vouchers
 * - Update pool configuration
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  Connection,
  clusterApiUrl
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
  createRevokeInstruction,
  getAccount,
} from "@solana/spl-token";
import { Carsa } from "./target/types/carsa";

// ============================================================================
// Constants and Configuration
// ============================================================================

const POOL_STATE_SEED = "pool_state";
const POOL_VAULT_AUTHORITY_SEED = "pool_vault_authority";
const USER_STAKE_SEED = "user_stake";

// Use Devnet by default
const CLUSTER = "devnet";
const connection = new Connection(clusterApiUrl(CLUSTER), "confirmed");

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Derive the pool state PDA
 */
export function getPoolStatePDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_STATE_SEED)],
    programId
  );
}

/**
 * Derive the pool vault authority PDA
 */
export function getPoolVaultAuthorityPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_VAULT_AUTHORITY_SEED)],
    programId
  );
}

/**
 * Derive a user's stake record PDA
 */
export function getUserStakePDA(
  programId: PublicKey,
  poolState: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(USER_STAKE_SEED),
      poolState.toBuffer(),
      user.toBuffer()
    ],
    programId
  );
}

// ============================================================================
// Pool Configuration Type
// ============================================================================

export interface PoolConfig {
  minStakeAmount: anchor.BN;
  maxStakePerUser: anchor.BN;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  apyBasisPoints: number;
}

// ============================================================================
// Initialize Pool
// ============================================================================

/**
 * Initialize a new voucher staking pool
 * 
 * @param program - The Carsa Anchor program instance
 * @param poolAuthority - The keypair that will manage the pool
 * @param poolDelegate - The public key that can execute deposits on behalf of users
 * @param voucherMint - The LOKAL token mint address
 * @param config - Pool configuration parameters
 * @returns Transaction signature
 */
export async function initializePool(
  program: Program<Carsa>,
  poolAuthority: Keypair,
  poolDelegate: PublicKey,
  voucherMint: PublicKey,
  config: PoolConfig
): Promise<string> {
  console.log("\n🚀 Initializing Voucher Pool...");
  console.log("Pool Authority:", poolAuthority.publicKey.toBase58());
  console.log("Pool Delegate:", poolDelegate.toBase58());
  console.log("Voucher Mint:", voucherMint.toBase58());

  // Derive PDAs
  const [poolState] = getPoolStatePDA(program.programId);
  const [poolVaultAuthority] = getPoolVaultAuthorityPDA(program.programId);

  console.log("Pool State PDA:", poolState.toBase58());
  console.log("Pool Vault Authority PDA:", poolVaultAuthority.toBase58());

  // Get the vault ATA (must be created beforehand)
  const vaultAta = await getAssociatedTokenAddress(
    voucherMint,
    poolVaultAuthority,
    true // allowOwnerOffCurve = true for PDA
  );

  console.log("Vault ATA:", vaultAta.toBase58());

  // Check if vault ATA exists, if not create it
  try {
    await getAccount(connection, vaultAta);
    console.log("✓ Vault ATA already exists");
  } catch (error) {
    console.log("Creating vault ATA...");
    const createAtaIx = createAssociatedTokenAccountInstruction(
      poolAuthority.publicKey,
      vaultAta,
      poolVaultAuthority,
      voucherMint
    );
    
    const createAtaTx = new Transaction().add(createAtaIx);
    const createAtaSig = await program.provider.sendAndConfirm(createAtaTx, [poolAuthority]);
    console.log("✓ Vault ATA created:", createAtaSig);
  }

  // Initialize the pool
  const tx = await program.methods
    .initializePool(config)
    .accounts({
      poolAuthority: poolAuthority.publicKey,
      poolDelegate: poolDelegate,
      poolState: poolState,
      vaultAta: vaultAta,
      poolVaultAuthority: poolVaultAuthority,
      voucherMint: voucherMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([poolAuthority])
    .rpc();

  console.log("✅ Pool initialized successfully!");
  console.log("Transaction signature:", tx);

  return tx;
}

// ============================================================================
// Deposit Voucher (Using Delegated Authority)
// ============================================================================

/**
 * Deposit voucher tokens into the staking pool using delegated authority
 * 
 * Note: The user must have previously approved the pool delegate to spend their tokens
 * 
 * @param program - The Carsa Anchor program instance
 * @param poolDelegate - The delegate keypair (backend service)
 * @param user - The user's public key
 * @param voucherMint - The LOKAL token mint address
 * @param amount - The amount of tokens to deposit
 * @returns Transaction signature
 */
export async function depositVoucher(
  program: Program<Carsa>,
  poolDelegate: Keypair,
  user: PublicKey,
  voucherMint: PublicKey,
  amount: anchor.BN
): Promise<string> {
  console.log("\n💰 Depositing Vouchers...");
  console.log("User:", user.toBase58());
  console.log("Amount:", amount.toString());

  // Derive PDAs
  const [poolState] = getPoolStatePDA(program.programId);
  const [poolVaultAuthority] = getPoolVaultAuthorityPDA(program.programId);
  const [userStakeRecord] = getUserStakePDA(program.programId, poolState, user);

  // Get ATAs
  const userVoucherAta = await getAssociatedTokenAddress(voucherMint, user);
  const poolVaultAta = await getAssociatedTokenAddress(
    voucherMint,
    poolVaultAuthority,
    true
  );

  console.log("User ATA:", userVoucherAta.toBase58());
  console.log("Pool Vault ATA:", poolVaultAta.toBase58());
  console.log("User Stake Record:", userStakeRecord.toBase58());

  // Execute deposit using delegated authority
  const tx = await program.methods
    .depositVoucher(amount)
    .accounts({
      user: user,
      poolDelegate: poolDelegate.publicKey,
      poolState: poolState,
      userStakeRecord: userStakeRecord,
      userVoucherAta: userVoucherAta,
      poolVaultAta: poolVaultAta,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([poolDelegate])
    .rpc();

  console.log("✅ Vouchers deposited successfully!");
  console.log("Transaction signature:", tx);

  return tx;
}

// ============================================================================
// Record Yield
// ============================================================================

/**
 * Record yield earned from staking activities
 * Called by the backend after converting vouchers to SOL and earning yield
 * 
 * @param program - The Carsa Anchor program instance
 * @param poolDelegate - The delegate keypair (backend service)
 * @param solAmount - The amount of SOL yield earned
 * @returns Transaction signature
 */
export async function recordYield(
  program: Program<Carsa>,
  poolDelegate: Keypair,
  solAmount: anchor.BN
): Promise<string> {
  console.log("\n📈 Recording Yield...");
  console.log("SOL Amount:", solAmount.toString());

  const [poolState] = getPoolStatePDA(program.programId);

  const tx = await program.methods
    .recordYield(solAmount)
    .accounts({
      poolDelegate: poolDelegate.publicKey,
      poolState: poolState,
    })
    .signers([poolDelegate])
    .rpc();

  console.log("✅ Yield recorded successfully!");
  console.log("Transaction signature:", tx);

  return tx;
}

// ============================================================================
// Redeem Voucher
// ============================================================================

/**
 * Redeem staked vouchers and claim earned yield
 * 
 * @param program - The Carsa Anchor program instance
 * @param user - The user's keypair
 * @param voucherMint - The LOKAL token mint address
 * @param amount - The amount of vouchers to redeem
 * @returns Transaction signature
 */
export async function redeemVoucher(
  program: Program<Carsa>,
  user: Keypair,
  voucherMint: PublicKey,
  amount: anchor.BN
): Promise<string> {
  console.log("\n💸 Redeeming Vouchers...");
  console.log("User:", user.publicKey.toBase58());
  console.log("Amount:", amount.toString());

  // Derive PDAs
  const [poolState] = getPoolStatePDA(program.programId);
  const [poolVaultAuthority] = getPoolVaultAuthorityPDA(program.programId);
  const [userStakeRecord] = getUserStakePDA(program.programId, poolState, user.publicKey);

  // Get ATAs
  const userVoucherAta = await getAssociatedTokenAddress(voucherMint, user.publicKey);
  const poolVaultAta = await getAssociatedTokenAddress(
    voucherMint,
    poolVaultAuthority,
    true
  );

  const tx = await program.methods
    .redeemVoucher(amount)
    .accounts({
      user: user.publicKey,
      poolState: poolState,
      userStakeRecord: userStakeRecord,
      userVoucherAta: userVoucherAta,
      poolVaultAta: poolVaultAta,
      poolVaultAuthority: poolVaultAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([user])
    .rpc();

  console.log("✅ Vouchers redeemed successfully!");
  console.log("Transaction signature:", tx);

  return tx;
}

// ============================================================================
// Update Pool Configuration
// ============================================================================

/**
 * Update pool configuration settings
 * Only the pool authority can perform this operation
 * 
 * @param program - The Carsa Anchor program instance
 * @param poolAuthority - The pool authority keypair
 * @param newConfig - New pool configuration
 * @returns Transaction signature
 */
export async function updatePoolConfig(
  program: Program<Carsa>,
  poolAuthority: Keypair,
  newConfig: PoolConfig
): Promise<string> {
  console.log("\n⚙️ Updating Pool Configuration...");

  const [poolState] = getPoolStatePDA(program.programId);

  const tx = await program.methods
    .updatePoolConfig(newConfig)
    .accounts({
      poolAuthority: poolAuthority.publicKey,
      poolState: poolState,
    })
    .signers([poolAuthority])
    .rpc();

  console.log("✅ Pool configuration updated successfully!");
  console.log("Transaction signature:", tx);

  return tx;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Fetch pool state data
 */
export async function getPoolState(
  program: Program<Carsa>
): Promise<any> {
  const [poolState] = getPoolStatePDA(program.programId);
  const poolData = await program.account.poolState.fetch(poolState);
  
  console.log("\n📊 Pool State:");
  console.log("Pool Authority:", poolData.poolAuthority.toBase58());
  console.log("Pool Delegate:", poolData.poolDelegate.toBase58());
  console.log("Total Voucher Staked:", poolData.totalVoucherStaked.toString());
  console.log("Total SOL Staked:", poolData.totalSolStaked.toString());
  console.log("Total Yield Earned:", poolData.totalYieldEarned.toString());
  console.log("Total Stakers:", poolData.totalStakers.toString());
  console.log("Deposits Enabled:", poolData.config.depositsEnabled);
  console.log("Withdrawals Enabled:", poolData.config.withdrawalsEnabled);
  
  return poolData;
}

/**
 * Fetch user stake record data
 */
export async function getUserStakeRecord(
  program: Program<Carsa>,
  user: PublicKey
): Promise<any> {
  const [poolState] = getPoolStatePDA(program.programId);
  const [userStakeRecord] = getUserStakePDA(program.programId, poolState, user);
  
  try {
    const stakeData = await program.account.userStakeRecord.fetch(userStakeRecord);
    
    console.log("\n👤 User Stake Record:");
    console.log("User:", stakeData.user.toBase58());
    console.log("Staked Amount:", stakeData.stakedAmount.toString());
    console.log("Total Yield Claimed:", stakeData.totalYieldClaimed.toString());
    console.log("Staked At:", new Date(stakeData.stakedAt.toNumber() * 1000).toLocaleString());
    
    return stakeData;
  } catch (error) {
    console.log("No stake record found for user");
    return null;
  }
}

// ============================================================================
// Example Usage / Demo
// ============================================================================

export async function runDemo() {
  console.log("=".repeat(60));
  console.log("🎯 Voucher Pool Demo - LOKAL Token Non-Custodial Staking");
  console.log("=".repeat(60));

  // Load the program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Carsa as Program<Carsa>;

  console.log("Program ID:", program.programId.toBase58());
  console.log("Cluster:", CLUSTER);

  // Setup accounts (in a real scenario, load these from your config)
  const poolAuthority = Keypair.generate();
  const poolDelegate = Keypair.generate();
  const user = Keypair.generate();
  
  // Load your LOKAL token mint address
  const voucherMint = new PublicKey("YOUR_LOKAL_MINT_ADDRESS_HERE");

  // Airdrop SOL for testing
  console.log("\n💸 Airdropping SOL for testing...");
  await connection.requestAirdrop(poolAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.requestAirdrop(poolDelegate.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for airdrops

  // 1. Initialize Pool
  const poolConfig: PoolConfig = {
    minStakeAmount: new anchor.BN(1_000_000), // 0.001 LOKAL (assuming 9 decimals)
    maxStakePerUser: new anchor.BN(1_000_000_000_000), // 1,000 LOKAL
    depositsEnabled: true,
    withdrawalsEnabled: true,
    apyBasisPoints: 1200, // 12% APY
  };

  await initializePool(
    program,
    poolAuthority,
    poolDelegate.publicKey,
    voucherMint,
    poolConfig
  );

  // 2. Query Pool State
  await getPoolState(program);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Demo completed successfully!");
  console.log("=".repeat(60));
}

// Run the demo if executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}
