/**
 * Initialize Voucher Pool Script
 * 
 * This script initializes the voucher staking pool on devnet.
 * Only needs to be run once.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair,
  Connection,
  clusterApiUrl,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Carsa } from "./target/types/carsa";
import * as fs from "fs";

// Configuration
const CLUSTER = "devnet";
const RPC_URL = clusterApiUrl(CLUSTER);
const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");

// Keypair paths
const DELEGATE_KEYPAIR_PATH = "../delegate-keypair.json";

// Helper functions
function getPoolStatePDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    programId
  );
  return pda;
}

function getPoolVaultAuthorityPDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault_authority")],
    programId
  );
  return pda;
}

async function main() {
  console.log("\n🚀 Initializing Voucher Staking Pool");
  console.log("=".repeat(70));
  
  try {
    // Setup connection
    const connection = new Connection(RPC_URL, "confirmed");
    console.log("Cluster:", CLUSTER);
    console.log("RPC:", RPC_URL);
    
    // Load delegate keypair (will be pool authority and delegate)
    const keypairData = JSON.parse(fs.readFileSync(DELEGATE_KEYPAIR_PATH, 'utf-8'));
    const poolAuthority = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log("Pool Authority:", poolAuthority.publicKey.toBase58());
    console.log("Pool Delegate:", poolAuthority.publicKey.toBase58());
    
    // Setup Anchor
    const wallet = new Wallet(poolAuthority);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);
    
    // Load program
    const idl = JSON.parse(fs.readFileSync("./target/idl/carsa.json", "utf-8"));
    const program = new Program(idl, provider) as Program<Carsa>;
    console.log("Program ID:", program.programId.toBase58());
    console.log("=".repeat(70));
    
    // Derive PDAs
    const poolState = getPoolStatePDA(program.programId);
    const poolVaultAuthority = getPoolVaultAuthorityPDA(program.programId);
    
    console.log("\nPDAs:");
    console.log("  Pool State:", poolState.toBase58());
    console.log("  Pool Vault Authority:", poolVaultAuthority.toBase58());
    
    // Get vault ATA
    const vaultAta = await getAssociatedTokenAddress(
      LOKAL_MINT,
      poolVaultAuthority,
      true // allowOwnerOffCurve for PDA
    );
    console.log("  Vault ATA:", vaultAta.toBase58());
    
    // Check if pool already exists
    try {
      const existingPool = await program.account.poolState.fetch(poolState);
      console.log("\n⚠️  Pool already initialized!");
      console.log("Total Voucher Staked:", Number(existingPool.totalVoucherStaked) / 1e9, "LOKAL");
      console.log("Total Stakers:", existingPool.totalStakers.toString());
      return;
    } catch (error) {
      // Pool doesn't exist, continue with initialization
      console.log("\n✅ Pool not found, proceeding with initialization");
    }
    
    // Check if vault ATA exists, create if not
    try {
      await getAccount(connection, vaultAta);
      console.log("✅ Vault ATA already exists");
    } catch (error) {
      console.log("\n📦 Creating vault ATA...");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        poolAuthority.publicKey,
        vaultAta,
        poolVaultAuthority,
        LOKAL_MINT
      );
      
      const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
      const createAtaSig = await provider.sendAndConfirm(createAtaTx, [poolAuthority]);
      console.log("✅ Vault ATA created:", createAtaSig);
    }
    
    // Pool configuration
    const poolConfig = {
      minStakeAmount: new anchor.BN(100_000_000), // 0.1 LOKAL minimum
      maxStakePerUser: new anchor.BN(1_000_000_000_000_000), // 1 million LOKAL max
      depositsEnabled: true,
      withdrawalsEnabled: true,
      apyBasisPoints: 1200, // 12% APY
    };
    
    console.log("\n📋 Pool Configuration:");
    console.log("  Min Stake:", Number(poolConfig.minStakeAmount) / 1e9, "LOKAL");
    console.log("  Max Stake per User:", Number(poolConfig.maxStakePerUser) / 1e9, "LOKAL");
    console.log("  Deposits Enabled:", poolConfig.depositsEnabled);
    console.log("  Withdrawals Enabled:", poolConfig.withdrawalsEnabled);
    console.log("  APY:", poolConfig.apyBasisPoints / 100, "%");
    
    // Initialize pool
    console.log("\n🚀 Initializing pool...");
    const tx = await program.methods
      .initializePool(poolConfig)
      .accounts({
        poolAuthority: poolAuthority.publicKey,
        poolDelegate: poolAuthority.publicKey, // Using same key for both
        voucherMint: LOKAL_MINT,
        vaultAta: vaultAta,
      })
      .signers([poolAuthority])
      .rpc();
    
    console.log("\n✅ Pool initialized successfully!");
    console.log("Transaction:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`);
    console.log("\n" + "=".repeat(70));
    
    // Verify initialization
    console.log("\n🔍 Verifying pool state...");
    const poolData = await program.account.poolState.fetch(poolState);
    console.log("\nPool State:");
    console.log("  Authority:", poolData.poolAuthority.toBase58());
    console.log("  Delegate:", poolData.poolDelegate.toBase58());
    console.log("  Voucher Mint:", poolData.voucherMint.toBase58());
    console.log("  Vault ATA:", poolData.vaultAta.toBase58());
    console.log("  Total Voucher Staked:", Number(poolData.totalVoucherStaked) / 1e9, "LOKAL");
    console.log("  Total SOL Staked:", Number(poolData.totalSolStaked) / 1e9, "SOL");
    console.log("  Total Stakers:", poolData.totalStakers.toString());
    console.log("\n✅ Pool is ready for deposits!");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\nProgram Logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
    process.exit(1);
  }
}

main();
