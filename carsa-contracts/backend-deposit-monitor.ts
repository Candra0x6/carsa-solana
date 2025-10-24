/**
 * Backend Monitoring Service for Auto-Staking
 * 
 * This script monitors user token approvals and automatically executes
 * the deposit_voucher instruction to stake their tokens.
 * 
 * How it works:
 * 1. User approves the pool delegate via frontend
 * 2. This script detects the approval
 * 3. Script calls deposit_voucher to transfer tokens to pool
 * 4. User's tokens are now staked and earning yield
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { Carsa } from "./target/types/carsa";
import * as fs from "fs";

// ============================================================================
// Configuration
// ============================================================================

const CLUSTER = process.env.CLUSTER || "devnet";
const RPC_URL = process.env.RPC_URL || clusterApiUrl(CLUSTER as any);
const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");

// Load the pool delegate keypair
const DELEGATE_KEYPAIR_PATH = process.env.DELEGATE_KEYPAIR_PATH || "../delegate-keypair.json";

// Polling interval in seconds
const POLL_INTERVAL_SEC = parseInt(process.env.POLL_INTERVAL || "10");

// ============================================================================
// Helper Functions
// ============================================================================

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

function getUserStakePDA(
  programId: PublicKey,
  poolState: PublicKey,
  user: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_stake"),
      poolState.toBuffer(),
      user.toBuffer()
    ],
    programId
  );
  return pda;
}

// ============================================================================
// Monitoring Service
// ============================================================================

class DepositMonitorService {
  private connection: Connection;
  private program: Program<Carsa>;
  private poolDelegate: Keypair;
  private processedApprovals: Set<string> = new Set();
  private knownUsers: Set<string> = new Set();

  constructor() {
    console.log("🚀 Initializing Deposit Monitor Service...");
    console.log("Cluster:", CLUSTER);
    console.log("RPC URL:", RPC_URL);
    
    this.connection = new Connection(RPC_URL, "confirmed");
    
    // Load delegate keypair
    try {
      const keypairData = JSON.parse(fs.readFileSync(DELEGATE_KEYPAIR_PATH, 'utf-8'));
      this.poolDelegate = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      console.log("✅ Loaded delegate keypair:", this.poolDelegate.publicKey.toBase58());
    } catch (error) {
      console.error("❌ Failed to load delegate keypair:", error);
      throw new Error("Could not load delegate keypair from: " + DELEGATE_KEYPAIR_PATH);
    }

    // Setup Anchor program
    const wallet = new Wallet(this.poolDelegate);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Load the IDL
    const idl = JSON.parse(
      fs.readFileSync("./target/idl/carsa.json", "utf-8")
    );
    this.program = new Program(idl, provider);

    console.log("✅ Program loaded:", PROGRAM_ID.toBase58());
  }

  /**
   * Check if a user has approved the pool delegate
   */
  async checkUserApproval(userPubkey: PublicKey): Promise<{
    hasApproval: boolean;
    allowance: bigint;
  }> {
    try {
      const userAta = await getAssociatedTokenAddress(LOKAL_MINT, userPubkey);
      const accountInfo = await getAccount(this.connection, userAta);

      // Check if delegate matches pool delegate
      if (
        accountInfo.delegate &&
        accountInfo.delegate.equals(this.poolDelegate.publicKey) &&
        accountInfo.delegatedAmount > BigInt(0)
      ) {
        return {
          hasApproval: true,
          allowance: accountInfo.delegatedAmount,
        };
      }

      return { hasApproval: false, allowance: BigInt(0) };
    } catch (error) {
      // User might not have ATA yet
      return { hasApproval: false, allowance: BigInt(0) };
    }
  }

  /**
   * Execute deposit for a user with approved tokens
   */
  async executeDeposit(userPubkey: PublicKey, amount: bigint): Promise<string> {
    console.log(`\n💰 Executing deposit for user: ${userPubkey.toBase58()}`);
    console.log(`   Amount: ${amount} (${Number(amount) / 1e9} LOKAL)`);

    try {
      // Derive PDAs
      const poolState = getPoolStatePDA(PROGRAM_ID);
      const poolVaultAuthority = getPoolVaultAuthorityPDA(PROGRAM_ID);
      const userStakeRecord = getUserStakePDA(PROGRAM_ID, poolState, userPubkey);

      // Get ATAs
      const userVoucherAta = await getAssociatedTokenAddress(LOKAL_MINT, userPubkey);
      const poolVaultAta = await getAssociatedTokenAddress(
        LOKAL_MINT,
        poolVaultAuthority,
        true // allowOwnerOffCurve for PDA
      );

      console.log("   User ATA:", userVoucherAta.toBase58());
      console.log("   Pool Vault:", poolVaultAta.toBase58());

      // Execute deposit using delegated authority
      const tx = await this.program.methods
        .depositVoucher(new anchor.BN(amount.toString()))
        .accounts({
          user: userPubkey,
          poolDelegate: this.poolDelegate.publicKey,
          userStakeRecord: userStakeRecord,
          userVoucherAta: userVoucherAta,
          poolVaultAta: poolVaultAta,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([this.poolDelegate])
        .rpc();

      console.log("   ✅ Deposit successful!");
      console.log("   Transaction:", tx);
      console.log("   Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`);

      return tx;
    } catch (error: any) {
      console.error("   ❌ Deposit failed:", error.message);
      throw error;
    }
  }

  /**
   * Process a user's pending approval
   */
  async processUser(userPubkey: PublicKey): Promise<void> {
    const userKey = userPubkey.toBase58();

    // Check if already processed in this session
    if (this.processedApprovals.has(userKey)) {
      return;
    }

    // Check approval status
    const { hasApproval, allowance } = await this.checkUserApproval(userPubkey);

    if (hasApproval && allowance > BigInt(0)) {
      console.log(`\n🔔 New approval detected!`);
      console.log(`   User: ${userKey}`);
      console.log(`   Allowance: ${allowance} (${Number(allowance) / 1e9} LOKAL)`);

      try {
        // Execute deposit
        await this.executeDeposit(userPubkey, allowance);

        // Mark as processed
        this.processedApprovals.add(userKey);
      } catch (error) {
        console.error(`Failed to process deposit for ${userKey}:`, error);
      }
    }
  }

  /**
   * Scan for token accounts with approvals
   */
  async scanForApprovals(): Promise<void> {
    console.log(`\n🔍 Scanning for approvals... (${new Date().toLocaleTimeString()})`);

    try {
      // Get all token accounts for the LOKAL mint
      const tokenAccounts = await this.connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            {
              dataSize: 165, // Token account size
            },
            {
              memcmp: {
                offset: 0, // Mint address offset
                bytes: LOKAL_MINT.toBase58(),
              },
            },
          ],
        }
      );

      console.log(`   Found ${tokenAccounts.length} LOKAL token accounts`);

      // Check each account for approval
      for (const { pubkey, account } of tokenAccounts) {
        try {
          const accountInfo = await getAccount(this.connection, pubkey);
          
          // Check if this account has approved our delegate
          if (
            accountInfo.delegate &&
            accountInfo.delegate.equals(this.poolDelegate.publicKey) &&
            accountInfo.delegatedAmount > BigInt(0)
          ) {
            const owner = accountInfo.owner;
            
            if (!this.knownUsers.has(owner.toBase58())) {
              console.log(`   📝 Found user with approval: ${owner.toBase58()}`);
              this.knownUsers.add(owner.toBase58());
            }

            await this.processUser(owner);
          }
        } catch (error) {
          // Skip invalid accounts
        }
      }

      console.log(`   ✅ Scan complete. Processed approvals: ${this.processedApprovals.size}`);
    } catch (error) {
      console.error("Error scanning for approvals:", error);
    }
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    console.log("\n" + "=".repeat(70));
    console.log("🎯 Auto-Staking Monitor Service Started");
    console.log("=".repeat(70));
    console.log(`Pool Delegate: ${this.poolDelegate.publicKey.toBase58()}`);
    console.log(`LOKAL Mint: ${LOKAL_MINT.toBase58()}`);
    console.log(`Poll Interval: ${POLL_INTERVAL_SEC} seconds`);
    console.log("=".repeat(70));

    // Initial scan
    await this.scanForApprovals();

    // Set up polling interval
    setInterval(async () => {
      await this.scanForApprovals();
    }, POLL_INTERVAL_SEC * 1000);

    console.log("\n✅ Monitor is now running. Press Ctrl+C to stop.");
  }
}

// ============================================================================
// Manual Deposit Function (for testing)
// ============================================================================

/**
 * Manually deposit tokens for a specific user
 * Usage: ts-node backend-deposit-monitor.ts manual <USER_PUBKEY>
 */
async function manualDeposit(userPubkeyStr: string): Promise<void> {
  console.log("\n🔧 Manual Deposit Mode");
  console.log("User:", userPubkeyStr);

  const service = new DepositMonitorService();
  const userPubkey = new PublicKey(userPubkeyStr);

  // Check approval
  const { hasApproval, allowance } = await service.checkUserApproval(userPubkey);

  if (!hasApproval || allowance === BigInt(0)) {
    console.error("❌ User has not approved the pool delegate or allowance is 0");
    console.log("Please have the user approve tokens first via the frontend");
    return;
  }

  console.log(`✅ Approval found: ${allowance} (${Number(allowance) / 1e9} LOKAL)`);
  
  // Execute deposit
  await service.executeDeposit(userPubkey, allowance);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "manual" && args[1]) {
    // Manual deposit mode
    await manualDeposit(args[1]);
  } else {
    // Auto-monitoring mode
    const service = new DepositMonitorService();
    await service.start();
  }
}

// Run the service
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { DepositMonitorService };
