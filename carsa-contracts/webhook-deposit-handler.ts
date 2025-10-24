/**
 * Webhook-based Auto-Deposit Handler
 * 
 * This can be deployed as a serverless function (Vercel, AWS Lambda, etc.)
 * and triggered by Helius/QuickNode webhooks when approvals occur.
 * 
 * No need to run a persistent background process!
 */

import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";

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

/**
 * Process deposit for a user who has approved delegation
 */
export async function processDeposit(userPubkey: PublicKey): Promise<string> {
  console.log("Processing deposit for:", userPubkey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  
  // Load delegate keypair from environment or file
  let poolDelegate: Keypair;
  if (process.env.DELEGATE_PRIVATE_KEY) {
    const secretKey = JSON.parse(process.env.DELEGATE_PRIVATE_KEY);
    poolDelegate = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } else {
    const keypairPath = process.env.DELEGATE_KEYPAIR_PATH || "../delegate-keypair.json";
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    poolDelegate = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  console.log("Pool Delegate:", poolDelegate.publicKey.toBase58());

  // Check if user has approved the delegate
  const userAta = await getAssociatedTokenAddress(LOKAL_MINT, userPubkey);
  const accountInfo = await getAccount(connection, userAta);

  if (!accountInfo.delegate || !accountInfo.delegate.equals(poolDelegate.publicKey)) {
    throw new Error("User has not approved pool delegate");
  }

  if (accountInfo.delegatedAmount === BigInt(0)) {
    throw new Error("Delegated amount is 0");
  }

  const amount = accountInfo.delegatedAmount;
  console.log("Delegated amount:", Number(amount) / 1e9, "LOKAL");

  // Setup Anchor
  const wallet = new anchor.Wallet(poolDelegate);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const idl = JSON.parse(fs.readFileSync("./target/idl/carsa.json", "utf-8"));
  const program = new Program(idl, provider);

  // Derive PDAs
  const poolState = getPoolStatePDA(program.programId);
  const poolVaultAuthority = getPoolVaultAuthorityPDA(program.programId);
  const userStakeRecord = getUserStakePDA(program.programId, poolState, userPubkey);

  const poolVaultAta = await getAssociatedTokenAddress(
    LOKAL_MINT,
    poolVaultAuthority,
    true
  );

  // Execute deposit
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

  console.log("✅ Deposit successful:", tx);
  return tx;
}

/**
 * Webhook handler for Helius/QuickNode
 * This function can be deployed as an API endpoint
 */
export async function webhookHandler(req: any, res: any) {
  try {
    const { transaction, type } = req.body;

    // Verify it's an Approve instruction
    if (type !== "APPROVE" && type !== "TOKEN_APPROVE") {
      return res.status(200).json({ message: "Not an approve transaction" });
    }

    // Extract user pubkey from transaction
    const userPubkey = new PublicKey(transaction.feePayer || transaction.accountData[0].account);

    // Process the deposit
    const txSignature = await processDeposit(userPubkey);

    return res.status(200).json({
      success: true,
      signature: txSignature,
      message: "Deposit processed successfully"
    });

  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// For local testing
if (require.main === module) {
  const testUser = process.argv[2];
  if (!testUser) {
    console.error("Usage: ts-node webhook-deposit-handler.ts <USER_PUBKEY>");
    process.exit(1);
  }

  processDeposit(new PublicKey(testUser))
    .then((sig) => {
      console.log("Success! Signature:", sig);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
