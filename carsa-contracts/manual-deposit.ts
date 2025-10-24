/**
 * Manual Deposit Script
 * 
 * Quick script to manually deposit tokens for a user who has approved the delegate.
 * 
 * Usage:
 *   ts-node manual-deposit.ts <USER_PUBKEY>
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
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { Carsa } from "./target/types/carsa";
import * as fs from "fs";

// Configuration
const CLUSTER = "devnet";
const RPC_URL = clusterApiUrl(CLUSTER);
const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");
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

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: ts-node manual-deposit.ts <USER_PUBKEY>");
    process.exit(1);
  }

  const userPubkeyStr = args[0];
  console.log("\n🔧 Manual Deposit Script");
  console.log("=".repeat(70));
  
  try {
    // Setup connection
    const connection = new Connection(RPC_URL, "confirmed");
    console.log("Cluster:", CLUSTER);
    console.log("RPC:", RPC_URL);
    
    // Load delegate keypair
    const keypairData = JSON.parse(fs.readFileSync(DELEGATE_KEYPAIR_PATH, 'utf-8'));
    const poolDelegate = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log("Pool Delegate:", poolDelegate.publicKey.toBase58());
    
    // Setup Anchor
    const wallet = new Wallet(poolDelegate);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);
    
    // Load program
    const idl = JSON.parse(fs.readFileSync("./target/idl/carsa.json", "utf-8"));
    const program = new Program(idl, provider) as Program<Carsa>;
    console.log("Program ID:", program.programId.toBase58());
    
    // Parse user pubkey
    const userPubkey = new PublicKey(userPubkeyStr);
    console.log("User:", userPubkey.toBase58());
    console.log("=".repeat(70));
    
    // Check user's approval
    console.log("\n🔍 Checking user approval...");
    const userAta = await getAssociatedTokenAddress(LOKAL_MINT, userPubkey);
    console.log("User ATA:", userAta.toBase58());
    
    const accountInfo = await getAccount(connection, userAta);
    console.log("Token Balance:", Number(accountInfo.amount) / 1e9, "LOKAL");
    
    if (!accountInfo.delegate) {
      console.error("❌ User has not approved any delegate");
      process.exit(1);
    }
    
    console.log("Delegate:", accountInfo.delegate.toBase58());
    console.log("Delegated Amount:", Number(accountInfo.delegatedAmount) / 1e9, "LOKAL");
    
    if (!accountInfo.delegate.equals(poolDelegate.publicKey)) {
      console.error("❌ Delegate does not match pool delegate");
      console.error("Expected:", poolDelegate.publicKey.toBase58());
      console.error("Got:", accountInfo.delegate.toBase58());
      process.exit(1);
    }
    
    if (accountInfo.delegatedAmount === BigInt(0)) {
      console.error("❌ Delegated amount is 0");
      process.exit(1);
    }
    
    console.log("✅ Approval is valid!");
    
    // Prepare deposit
    const amount = accountInfo.delegatedAmount;
    console.log("\n💰 Preparing deposit...");
    console.log("Amount:", Number(amount) / 1e9, "LOKAL");
    
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
    console.log("\n🚀 Executing deposit...");
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
    
    console.log("\n✅ Deposit successful!");
    console.log("Transaction:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`);
    console.log("\n" + "=".repeat(70));
    
    // Verify the deposit
    console.log("\n🔍 Verifying deposit...");
    const updatedAta = await getAccount(connection, userAta);
    console.log("New Token Balance:", Number(updatedAta.amount) / 1e9, "LOKAL");
    console.log("Delegated Amount:", Number(updatedAta.delegatedAmount) / 1e9, "LOKAL");
    
    try {
      const stakeRecord = await program.account.userStakeRecord.fetch(userStakeRecord);
      console.log("\nStake Record:");
      console.log("  Staked Amount:", Number(stakeRecord.stakedAmount) / 1e9, "LOKAL");
      console.log("  Staked At:", new Date(stakeRecord.stakedAt.toNumber() * 1000).toLocaleString());
    } catch (error) {
      console.log("Could not fetch stake record");
    }
    
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
