import { NextRequest, NextResponse } from 'next/server';
import { 
  Connection, 
  PublicKey, 
  Keypair,
  clusterApiUrl,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

// Configuration
const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL = process.env.RPC_URL || clusterApiUrl(CLUSTER as "devnet" | "mainnet-beta");
const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const APY_BASIS_POINTS = parseInt(process.env.APY_BASIS_POINTS || "1200");
const YIELD_INTERVAL_HOURS = parseInt(process.env.YIELD_INTERVAL_HOURS || "6");

// Helper Functions
function getPoolStatePDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    programId
  );
  return pda;
}

function readU64LE(buffer: Uint8Array, offset: number): bigint {
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value += BigInt(buffer[offset + i]) << BigInt(8 * i);
  }
  return value;
}

function readI64LE(buffer: Uint8Array, offset: number): bigint {
  const unsigned = readU64LE(buffer, offset);
  if (unsigned >= BigInt(1) << BigInt(63)) {
    return unsigned - (BigInt(1) << BigInt(64));
  }
  return unsigned;
}

function calculateYield(
  stakedAmount: bigint,
  apyBasisPoints: number,
  secondsElapsed: number
): bigint {
  const staked = BigInt(stakedAmount);
  const apy = BigInt(apyBasisPoints);
  const elapsed = BigInt(secondsElapsed);
  const SECONDS_PER_YEAR = BigInt(31557600);
  const BASIS_POINTS = BigInt(10000);
  
  const numerator = staked * apy * elapsed;
  const denominator = SECONDS_PER_YEAR * BASIS_POINTS;
  
  return numerator / denominator;
}

interface PoolStateInfo {
  totalStaked: number;
  lastYieldUpdate: number;
  totalYieldEarned: number;
  secondsElapsed: number;
  hoursElapsed: number;
  calculatedYield: number;
  needsUpdate: boolean;
}

interface RecordYieldResponse {
  success: boolean;
  poolState?: PoolStateInfo;
  transaction?: string;
  yieldRecorded?: number;
  message?: string;
  error?: string;
}

/**
 * GET /api/record-yield
 * Get current pool state and yield information
 */
export async function GET(): Promise<NextResponse<RecordYieldResponse>> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const poolStatePDA = getPoolStatePDA(PROGRAM_ID);
    
    // Fetch pool state
    const accountInfo = await connection.getAccountInfo(poolStatePDA);
    
    if (!accountInfo) {
      return NextResponse.json({
        success: false,
        error: 'Pool state not found'
      }, { status: 404 });
    }
    
    const data = accountInfo.data;
    
    // Parse pool state
    const totalStaked = readU64LE(data, 156);
    const totalYieldEarned = readU64LE(data, 172);
    const lastYieldUpdate = readI64LE(data, 196);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const secondsElapsed = currentTime - Number(lastYieldUpdate);
    const hoursElapsed = secondsElapsed / 3600;
    
    const calculatedYield = calculateYield(
      totalStaked,
      APY_BASIS_POINTS,
      secondsElapsed
    );
    
    const minIntervalSeconds = YIELD_INTERVAL_HOURS * 3600;
    const needsUpdate = secondsElapsed >= minIntervalSeconds && totalStaked > 0;
    
    const poolState: PoolStateInfo = {
      totalStaked: Number(totalStaked) / 1e9,
      lastYieldUpdate: Number(lastYieldUpdate),
      totalYieldEarned: Number(totalYieldEarned) / 1e9,
      secondsElapsed,
      hoursElapsed: parseFloat(hoursElapsed.toFixed(2)),
      calculatedYield: Number(calculatedYield) / 1e9,
      needsUpdate
    };
    
    return NextResponse.json({
      success: true,
      poolState,
      message: needsUpdate 
        ? 'Pool ready for yield update' 
        : `Wait ${(minIntervalSeconds - secondsElapsed) / 3600} more hours`
    });
    
  } catch (error) {
    console.error('Error fetching pool state:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pool state'
    }, { status: 500 });
  }
}

/**
 * POST /api/record-yield
 * Manually trigger yield recording (admin only)
 * 
 * Optional body:
 * {
 *   "adminKey": "your-secret-admin-key",
 *   "force": false  // If true, skip time check (for testing)
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecordYieldResponse>> {
  try {
    // Optional: Admin authentication
    const body = await request.json().catch(() => ({}));
    const adminKey = body.adminKey || request.headers.get('x-admin-key');
    const expectedAdminKey = process.env.ADMIN_API_KEY;
    
    if (expectedAdminKey && adminKey !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const force = body.force === true;
    
    console.log("\n🔧 Manual Yield Recording Triggered");
    console.log("Force:", force);
    console.log("Time:", new Date().toISOString());
    
    // Setup connection
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Load delegate keypair
    let poolDelegate: Keypair;
    if (process.env.DELEGATE_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.DELEGATE_PRIVATE_KEY);
      poolDelegate = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } else {
      const fs = await import('fs');
      const path = await import('path');
      const delegateKeypairPath = path.join(process.cwd(), '../delegate-keypair.json');
      
      try {
        const keypairData = JSON.parse(fs.readFileSync(delegateKeypairPath, 'utf-8'));
        poolDelegate = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Server configuration error: delegate keypair not found'
        }, { status: 500 });
      }
    }
    
    console.log("Pool Delegate:", poolDelegate.publicKey.toBase58());
    
    // Get pool state
    const poolStatePDA = getPoolStatePDA(PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(poolStatePDA);
    
    if (!accountInfo) {
      return NextResponse.json({
        success: false,
        error: 'Pool state not found'
      }, { status: 404 });
    }
    
    const data = accountInfo.data;
    const totalStaked = readU64LE(data, 156);
    const totalYieldEarned = readU64LE(data, 172);
    const lastYieldUpdate = readI64LE(data, 196);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const secondsElapsed = currentTime - Number(lastYieldUpdate);
    
    console.log("\nPool State:");
    console.log("  Total Staked:", Number(totalStaked) / 1e9, "LOKAL");
    console.log("  Last Update:", new Date(Number(lastYieldUpdate) * 1000).toLocaleString());
    console.log("  Time Elapsed:", (secondsElapsed / 3600).toFixed(2), "hours");
    
    // Check if update is needed
    const minIntervalSeconds = YIELD_INTERVAL_HOURS * 3600;
    if (!force && secondsElapsed < minIntervalSeconds) {
      const hoursRemaining = ((minIntervalSeconds - secondsElapsed) / 3600).toFixed(2);
      return NextResponse.json({
        success: false,
        message: `Not enough time elapsed. Wait ${hoursRemaining} more hours.`,
        poolState: {
          totalStaked: Number(totalStaked) / 1e9,
          lastYieldUpdate: Number(lastYieldUpdate),
          totalYieldEarned: Number(totalYieldEarned) / 1e9,
          secondsElapsed,
          hoursElapsed: parseFloat((secondsElapsed / 3600).toFixed(2)),
          calculatedYield: 0,
          needsUpdate: false
        }
      }, { status: 400 });
    }
    
    if (totalStaked === BigInt(0)) {
      return NextResponse.json({
        success: false,
        message: 'No tokens staked in pool',
        poolState: {
          totalStaked: 0,
          lastYieldUpdate: Number(lastYieldUpdate),
          totalYieldEarned: Number(totalYieldEarned) / 1e9,
          secondsElapsed,
          hoursElapsed: parseFloat((secondsElapsed / 3600).toFixed(2)),
          calculatedYield: 0,
          needsUpdate: false
        }
      }, { status: 400 });
    }
    
    // Calculate yield
    const yieldAmount = calculateYield(totalStaked, APY_BASIS_POINTS, secondsElapsed);
    
    console.log("\n💰 Recording Yield:");
    console.log("  Amount:", Number(yieldAmount) / 1e9, "LOKAL");
    console.log("  APY:", APY_BASIS_POINTS / 100, "%");
    console.log("  Period:", (secondsElapsed / 3600).toFixed(2), "hours");
    
    if (yieldAmount === BigInt(0)) {
      return NextResponse.json({
        success: false,
        message: 'Calculated yield is 0',
        poolState: {
          totalStaked: Number(totalStaked) / 1e9,
          lastYieldUpdate: Number(lastYieldUpdate),
          totalYieldEarned: Number(totalYieldEarned) / 1e9,
          secondsElapsed,
          hoursElapsed: parseFloat((secondsElapsed / 3600).toFixed(2)),
          calculatedYield: 0,
          needsUpdate: false
        }
      }, { status: 400 });
    }
    
    // Setup Anchor
    const wallet = {
      publicKey: poolDelegate.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) {
          tx.partialSign(poolDelegate);
        }
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        return txs.map(tx => {
          if (tx instanceof Transaction) {
            tx.partialSign(poolDelegate);
          }
          return tx;
        });
      },
    };
    
    const provider = new AnchorProvider(connection, wallet as anchor.Wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);
    
    // Load IDL
    const fs = await import('fs');
    const path = await import('path');
    const idlPath = path.join(process.cwd(), 'public', 'carsa-idl.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    const program = new Program(idl, provider) as Program;
    
    // Execute record_yield
    console.log("🚀 Executing record_yield instruction...");
    
    try {
      const tx = await program.methods
        .recordYield(new anchor.BN(yieldAmount.toString()))
        .accounts({
          poolDelegate: poolDelegate.publicKey,
        })
        .signers([poolDelegate])
        .rpc();
      
      console.log("✅ Yield recorded successfully!");
      console.log("Transaction:", tx);
      
      return NextResponse.json({
        success: true,
        transaction: tx,
        yieldRecorded: Number(yieldAmount) / 1e9,
        poolState: {
          totalStaked: Number(totalStaked) / 1e9,
          lastYieldUpdate: Number(lastYieldUpdate),
          totalYieldEarned: Number(totalYieldEarned) / 1e9,
          secondsElapsed,
          hoursElapsed: parseFloat((secondsElapsed / 3600).toFixed(2)),
          calculatedYield: Number(yieldAmount) / 1e9,
          needsUpdate: true
        },
        message: 'Yield recorded successfully'
      });
      
    } catch (error: unknown) {
      console.error("❌ Yield recording failed:", error);
      
      let errorMessage = 'Failed to record yield';
      if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
        if ('logs' in error) {
          console.error("Program Logs:", error.logs);
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in POST /api/record-yield:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
