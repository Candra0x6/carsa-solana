import { NextRequest, NextResponse } from 'next/server';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl,
  Transaction,
  VersionedTransaction
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

// Configuration
const CLUSTER = "devnet";
const RPC_URL = clusterApiUrl(CLUSTER);
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");

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

export interface DepositRequest {
  userPubkey: string;
}

export interface DepositResponse {
  success: boolean;
  signature?: string;
  amount?: number;
  error?: string;
}

/**
 * POST /api/deposit
 * Backend endpoint to execute deposit for a user who has approved the pool delegate
 */
export async function POST(request: NextRequest): Promise<NextResponse<DepositResponse>> {
  try {
    const body: DepositRequest = await request.json();
    
    // Validate required fields
    if (!body.userPubkey) {
      return NextResponse.json({
        success: false,
        error: 'Missing userPubkey'
      }, { status: 400 });
    }

    // Validate user public key
    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(body.userPubkey);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid user public key'
      }, { status: 400 });
    }

    console.log("\n🔧 Processing Deposit Request");
    console.log("User:", userPubkey.toBase58());

    // Setup connection
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Load delegate keypair from environment
    let poolDelegate: Keypair;
    if (process.env.DELEGATE_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.DELEGATE_PRIVATE_KEY);
      poolDelegate = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } else {
      // For development, try to load from file
      const fs = await import('fs');
      const path = await import('path');
      const delegateKeypairPath = path.join(process.cwd(), '../delegate-keypair.json');
      
      try {
        const keypairData = JSON.parse(fs.readFileSync(delegateKeypairPath, 'utf-8'));
        poolDelegate = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      } catch {
        console.error("Failed to load delegate keypair");
        return NextResponse.json({
          success: false,
          error: 'Server configuration error: delegate keypair not found'
        }, { status: 500 });
      }
    }
    
    console.log("Pool Delegate:", poolDelegate.publicKey.toBase58());
    
    // Check user's approval
    console.log("🔍 Checking user approval...");
    const userAta = await getAssociatedTokenAddress(LOKAL_MINT, userPubkey);
    
    let accountInfo;
    try {
      accountInfo = await getAccount(connection, userAta);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'User token account not found'
      }, { status: 404 });
    }
    
    console.log("Token Balance:", Number(accountInfo.amount) / 1e9, "LOKAL");
    
    if (!accountInfo.delegate) {
      return NextResponse.json({
        success: false,
        error: 'User has not approved any delegate'
      }, { status: 400 });
    }
    
    console.log("Delegate:", accountInfo.delegate.toBase58());
    console.log("Delegated Amount:", Number(accountInfo.delegatedAmount) / 1e9, "LOKAL");
    
    if (!accountInfo.delegate.equals(poolDelegate.publicKey)) {
      return NextResponse.json({
        success: false,
        error: 'Delegate does not match pool delegate'
      }, { status: 400 });
    }
    
    if (accountInfo.delegatedAmount === BigInt(0)) {
      return NextResponse.json({
        success: false,
        error: 'Delegated amount is 0'
      }, { status: 400 });
    }
    
    console.log("✅ Approval is valid!");
    
    // Prepare deposit
    const amount = accountInfo.delegatedAmount;
    console.log("💰 Preparing deposit...");
    console.log("Amount:", Number(amount) / 1e9, "LOKAL");
    
    // Setup Anchor with a simple wallet implementation
    // This matches the Wallet interface from @coral-xyz/anchor
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
    
    const provider = new AnchorProvider(
      connection, 
      wallet as anchor.Wallet, 
      {
        commitment: "confirmed",
      }
    );
    anchor.setProvider(provider);
    
    // Load program IDL
    // Using the public IDL JSON file
    const fs = await import('fs');
    const path = await import('path');
    const idlPath = path.join(process.cwd(), 'public', 'carsa-idl.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    
    const program = new Program(
      idl, 
      provider
    ) as Program;
    
    console.log("Program ID:", program.programId.toBase58());
    
    // Derive PDAs
    const poolState = getPoolStatePDA(program.programId);
    const poolVaultAuthority = getPoolVaultAuthorityPDA(program.programId);
    const userStakeRecord = getUserStakePDA(program.programId, poolState, userPubkey);
    
    const poolVaultAta = await getAssociatedTokenAddress(
      LOKAL_MINT,
      poolVaultAuthority,
      true
    );
    
    console.log("\nAccounts:");
    console.log("  Pool State:", poolState.toBase58());
    console.log("  User Stake Record:", userStakeRecord.toBase58());
    console.log("  Pool Vault:", poolVaultAta.toBase58());
    
    // Execute deposit
    console.log("🚀 Executing deposit...");
    
    try {
      // Note: Only pass the non-PDA accounts
      // Anchor automatically derives PDAs (poolState, userStakeRecord) and programs (systemProgram, tokenProgram)
      const tx = await program.methods
        .depositVoucher(new anchor.BN(amount.toString()))
        .accounts({
          user: userPubkey,
          poolDelegate: poolDelegate.publicKey,
          userVoucherAta: userAta,
          poolVaultAta: poolVaultAta,
        })
        .signers([poolDelegate])
        .rpc();
      
      console.log("✅ Deposit successful!");
      console.log("Transaction:", tx);
      
      return NextResponse.json({
        success: true,
        signature: tx,
        amount: Number(amount) / 1e9
      });
      
    } catch (error: unknown) {
      console.error("❌ Deposit transaction failed:", error);
      
      let errorMessage = 'Deposit transaction failed';
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
    console.error('Error in POST /api/deposit:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/deposit
 * Get information about the deposit API
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Deposit API',
    usage: 'POST with userPubkey to execute voucher deposit',
    example: {
      userPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
    }
  });
}
