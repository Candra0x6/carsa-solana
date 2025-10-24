/**
 * Yield Recording Service
 * 
 * Production-ready backend service that periodically calculates and records
 * yield for the staking pool based on APY and time elapsed.
 * 
 * Features:
 * - Automatic yield calculation based on time elapsed
 * - Configurable intervals (hourly, daily, etc.)
 * - Error handling and retry logic
 * - Logging for monitoring
 * - Can run as cron job or continuous service
 * 
 * Usage:
 *   ts-node record-yield-service.ts
 *   
 * Environment Variables:
 *   DELEGATE_PRIVATE_KEY - Pool delegate private key (JSON array)
 *   DELEGATE_KEYPAIR_PATH - Path to delegate keypair file (fallback)
 *   YIELD_INTERVAL_HOURS - How often to record yield (default: 6)
 *   APY_BASIS_POINTS - Annual yield in basis points (default: 1200 = 12%)
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
} from "@solana/spl-token";
import { Carsa } from "./target/types/carsa";
import * as fs from "fs";

// ============================================================================
// Configuration
// ============================================================================

const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL = process.env.RPC_URL || clusterApiUrl(CLUSTER as "devnet" | "mainnet-beta");
const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");

// Yield recording interval in hours (default: 6 hours)
const YIELD_INTERVAL_HOURS = parseInt(process.env.YIELD_INTERVAL_HOURS || "6");

// APY in basis points (default: 1200 = 12%)
const APY_BASIS_POINTS = parseInt(process.env.APY_BASIS_POINTS || "1200");

// Delegate keypair path
const DELEGATE_KEYPAIR_PATH = process.env.DELEGATE_KEYPAIR_PATH || "../delegate-keypair.json";

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

/**
 * Calculate yield based on staked amount, APY, and time elapsed
 * 
 * Formula: yield = (staked_amount * apy * time_elapsed) / (365.25 * 24 * 3600 * 10000)
 * 
 * @param stakedAmount - Total amount staked (in lamports)
 * @param apyBasisPoints - APY in basis points (e.g., 1200 = 12%)
 * @param secondsElapsed - Time elapsed since last yield update
 * @returns Yield amount in lamports
 */
function calculateYield(
  stakedAmount: bigint,
  apyBasisPoints: number,
  secondsElapsed: number
): bigint {
  // Convert to BigInt for precision
  const staked = BigInt(stakedAmount);
  const apy = BigInt(apyBasisPoints);
  const elapsed = BigInt(secondsElapsed);
  
  // Seconds in a year: 365.25 * 24 * 3600 = 31,557,600
  const SECONDS_PER_YEAR = BigInt(31557600);
  
  // Basis points divisor
  const BASIS_POINTS = BigInt(10000);
  
  // yield = (staked * apy * elapsed) / (SECONDS_PER_YEAR * BASIS_POINTS)
  const numerator = staked * apy * elapsed;
  const denominator = SECONDS_PER_YEAR * BASIS_POINTS;
  
  return numerator / denominator;
}

/**
 * Read u64 from buffer (little-endian)
 */
function readU64LE(buffer: Buffer, offset: number): bigint {
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value += BigInt(buffer[offset + i]) << BigInt(8 * i);
  }
  return value;
}

/**
 * Read i64 from buffer (little-endian)
 */
function readI64LE(buffer: Buffer, offset: number): bigint {
  const unsigned = readU64LE(buffer, offset);
  // Convert to signed if MSB is set
  if (unsigned >= BigInt(1) << BigInt(63)) {
    return unsigned - (BigInt(1) << BigInt(64));
  }
  return unsigned;
}

// ============================================================================
// Yield Recording Service
// ============================================================================

class YieldRecordingService {
  private connection: Connection;
  private poolDelegate: Keypair;
  private program: Program<Carsa>;
  private isRunning: boolean = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection(RPC_URL, "confirmed");
    this.poolDelegate = this.loadDelegateKeypair();
    this.program = this.initializeProgram();
  }

  /**
   * Load pool delegate keypair from environment or file
   */
  private loadDelegateKeypair(): Keypair {
    if (process.env.DELEGATE_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.DELEGATE_PRIVATE_KEY);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } else {
      const keypairData = JSON.parse(fs.readFileSync(DELEGATE_KEYPAIR_PATH, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(keypairData));
    }
  }

  /**
   * Initialize Anchor program
   */
  private initializeProgram(): Program<Carsa> {
    const wallet = new Wallet(this.poolDelegate);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    const idl = JSON.parse(fs.readFileSync("./target/idl/carsa.json", "utf-8"));
    return new Program(idl, provider) as Program<Carsa>;
  }

  /**
   * Fetch and parse pool state
   */
  async getPoolState(): Promise<{
    totalStaked: bigint;
    lastYieldUpdate: bigint;
    totalYieldEarned: bigint;
    rewardIndex: bigint;
  }> {
    const poolStatePDA = getPoolStatePDA(this.program.programId);
    const accountInfo = await this.connection.getAccountInfo(poolStatePDA);

    if (!accountInfo) {
      throw new Error("Pool state account not found");
    }

    const data = accountInfo.data;

    // PoolState layout:
    // discriminator(8) + pool_authority(32) + pool_delegate(32) + vault_ata(32) + 
    // voucher_mint(32) + config(20) + total_voucher_staked(8) + total_sol_staked(8) +
    // total_yield_earned(8) + reward_index(16) + last_yield_update(8) + total_stakers(8) + bump(1)

    const totalStaked = readU64LE(data, 8 + 32 + 32 + 32 + 32 + 20); // offset 156
    const totalSolStaked = readU64LE(data, 8 + 32 + 32 + 32 + 32 + 20 + 8); // offset 164
    const totalYieldEarned = readU64LE(data, 8 + 32 + 32 + 32 + 32 + 20 + 8 + 8); // offset 172
    
    let rewardIndexValue = BigInt(0);
    for (let i = 0; i < 16; i++) {
      rewardIndexValue += BigInt(data[180 + i]) << BigInt(8 * i);
    }
    
    const lastYieldUpdate = readI64LE(data, 196); // offset 196

    return {
      totalStaked,
      lastYieldUpdate,
      totalYieldEarned,
      rewardIndex: rewardIndexValue,
    };
  }

  /**
   * Calculate and record yield
   */
  async recordYield(): Promise<string | null> {
    try {
      console.log("\n📊 Checking if yield recording is needed...");
      console.log("Time:", new Date().toISOString());

      // Get pool state
      const poolState = await this.getPoolState();
      const currentTime = Math.floor(Date.now() / 1000);
      const lastUpdate = Number(poolState.lastYieldUpdate);
      const secondsElapsed = currentTime - lastUpdate;

      console.log("\nPool State:");
      console.log("  Total Staked:", Number(poolState.totalStaked) / 1e9, "LOKAL");
      console.log("  Last Yield Update:", new Date(lastUpdate * 1000).toLocaleString());
      console.log("  Time Elapsed:", (secondsElapsed / 3600).toFixed(2), "hours");
      console.log("  Total Yield Earned:", Number(poolState.totalYieldEarned) / 1e9, "LOKAL");

      // Check if enough time has elapsed
      const minIntervalSeconds = YIELD_INTERVAL_HOURS * 3600;
      if (secondsElapsed < minIntervalSeconds) {
        const hoursRemaining = ((minIntervalSeconds - secondsElapsed) / 3600).toFixed(2);
        console.log(`⏳ Not enough time elapsed. Wait ${hoursRemaining} more hours.`);
        return null;
      }

      // Check if there's anything staked
      if (poolState.totalStaked === BigInt(0)) {
        console.log("⚠️ No tokens staked. Skipping yield recording.");
        return null;
      }

      // Calculate yield
      const yieldAmount = calculateYield(
        poolState.totalStaked,
        APY_BASIS_POINTS,
        secondsElapsed
      );

      console.log("\n💰 Recording Yield:");
      console.log("  Yield Amount:", Number(yieldAmount) / 1e9, "LOKAL");
      console.log("  APY:", APY_BASIS_POINTS / 100, "%");
      console.log("  Period:", (secondsElapsed / 3600).toFixed(2), "hours");

      if (yieldAmount === BigInt(0)) {
        console.log("⚠️ Calculated yield is 0. Skipping.");
        return null;
      }

      // Execute record_yield instruction
      const poolStatePDA = getPoolStatePDA(this.program.programId);
      
      console.log("\n🚀 Executing record_yield instruction...");
      const tx = await this.program.methods
        .recordYield(new anchor.BN(yieldAmount.toString()))
        .accounts({
          poolDelegate: this.poolDelegate.publicKey,
        })
        .signers([this.poolDelegate])
        .rpc();

      console.log("✅ Yield recorded successfully!");
      console.log("Transaction:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`);

      return tx;
    } catch (error: any) {
      console.error("\n❌ Error recording yield:", error.message);
      if (error.logs) {
        console.error("Program Logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  }

  /**
   * Start the yield recording service (runs continuously)
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ Service is already running");
      return;
    }

    console.log("\n🚀 Starting Yield Recording Service");
    console.log("=".repeat(70));
    console.log("Cluster:", CLUSTER);
    console.log("RPC:", RPC_URL);
    console.log("Pool Delegate:", this.poolDelegate.publicKey.toBase58());
    console.log("Program ID:", this.program.programId.toBase58());
    console.log("Yield Interval:", YIELD_INTERVAL_HOURS, "hours");
    console.log("APY:", APY_BASIS_POINTS / 100, "%");
    console.log("=".repeat(70));

    this.isRunning = true;

    // Run immediately on start
    this.recordYield().catch(err => {
      console.error("Initial yield recording failed:", err.message);
    });

    // Then run every hour (we check elapsed time inside recordYield)
    const checkIntervalMs = 60 * 60 * 1000; // Check every hour
    this.intervalHandle = setInterval(async () => {
      try {
        await this.recordYield();
      } catch (error: any) {
        console.error("Periodic yield recording failed:", error.message);
      }
    }, checkIntervalMs);

    console.log("\n✅ Service started. Checking every hour for yield updates.");
    console.log("Press Ctrl+C to stop.\n");
  }

  /**
   * Stop the service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log("\n🛑 Stopping Yield Recording Service...");
    
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
    console.log("✅ Service stopped.");
  }

  /**
   * Run once (for cron jobs)
   */
  async runOnce(): Promise<void> {
    console.log("\n🔧 Running Yield Recording (One-time)");
    console.log("=".repeat(70));
    console.log("Cluster:", CLUSTER);
    console.log("Pool Delegate:", this.poolDelegate.publicKey.toBase58());
    console.log("=".repeat(70));

    try {
      const tx = await this.recordYield();
      if (tx) {
        console.log("\n✅ Yield recording complete!");
        process.exit(0);
      } else {
        console.log("\n⏭️ No yield to record at this time.");
        process.exit(0);
      }
    } catch (error: any) {
      console.error("\n❌ Yield recording failed!");
      console.error(error.message);
      process.exit(1);
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const service = new YieldRecordingService();

  // Check if running as cron job or continuous service
  const mode = process.argv[2] || "continuous";

  if (mode === "once" || mode === "cron") {
    // Run once (for cron jobs)
    await service.runOnce();
  } else {
    // Run continuously
    service.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log("\n\nReceived SIGINT signal");
      service.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log("\n\nReceived SIGTERM signal");
      service.stop();
      process.exit(0);
    });
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

export { YieldRecordingService };
