import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Carsa } from "../target/types/carsa";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

describe("Carsa Comprehensive Client Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carsa as Program<Carsa>;
  
  // Global test accounts - reused across tests to minimize airdrop requirements
  let mintKeypair: Keypair;
  let updateAuthority: Keypair;
  let mintAuthorityPda: PublicKey;
  let configPda: PublicKey;

  before("Setup test environment", async () => {
    console.log("🚀 Starting Carsa comprehensive client tests");
    
    // Generate unique accounts to avoid conflicts
    mintKeypair = Keypair.generate();
    updateAuthority = Keypair.generate();

    // Only one SOL airdrop to minimize rate limiting
    console.log("💰 Requesting SOL airdrop for update authority...");
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        updateAuthority.publicKey, 
        10 * anchor.web3.LAMPORTS_PER_SOL // More SOL to handle all operations
      )
    );

    // Derive PDAs
    [mintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    console.log("✅ Test environment setup completed");
    console.log(`📄 Program ID: ${program.programId.toString()}`);
    console.log(`🏦 Mint: ${mintKeypair.publicKey.toString()}`);
    console.log(`⚙️  Config PDA: ${configPda.toString()}`);
  });

  it("Complete Carsa Loyalty Program Workflow", async () => {
    console.log("\n=== 1. Initialize Lokal Mint ===");
    
    // Step 1: Initialize the mint
    const initTx = await program.methods
      .initializeLokalMint()
      .accounts({
        updateAuthority: updateAuthority.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([updateAuthority, mintKeypair])
      .rpc();

    console.log(`✅ Mint initialized: ${initTx}`);

    // Verify mint was created correctly
    const mintInfo = await getMint(provider.connection, mintKeypair.publicKey);
    expect(mintInfo.decimals).to.equal(9);
    expect(mintInfo.mintAuthority?.toBase58()).to.equal(mintAuthorityPda.toBase58());
    expect(mintInfo.supply).to.equal(BigInt(0));

    console.log("\n=== 2. Register Merchants ===");

    // Step 2: Register merchants using the update authority's SOL
    const merchant1 = Keypair.generate();
    const merchant2 = Keypair.generate();

    const [merchant1AccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchant1.publicKey.toBuffer()],
      program.programId
    );

    const [merchant2AccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchant2.publicKey.toBuffer()],
      program.programId
    );

    // Register first merchant (Coffee Shop with 5% cashback)
    const registerMerchant1Tx = await program.methods
      .registerMerchant("Coffee Shop", "restaurant", 500)
      .accounts({
        merchantOwner: merchant1.publicKey,
        merchantAccount: merchant1AccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([updateAuthority, merchant1]) // Update authority pays for account creation
      .preInstructions([
        SystemProgram.transfer({
          fromPubkey: updateAuthority.publicKey,
          toPubkey: merchant1.publicKey,
          lamports: 0.5 * anchor.web3.LAMPORTS_PER_SOL,
        })
      ])
      .rpc();

    console.log(`✅ Coffee Shop registered: ${registerMerchant1Tx}`);

    // Register second merchant (Book Store with 3% cashback)
    const registerMerchant2Tx = await program.methods
      .registerMerchant("Book Store", "retail", 300)
      .accounts({
        merchantOwner: merchant2.publicKey,
        merchantAccount: merchant2AccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([updateAuthority, merchant2]) // Update authority pays for account creation
      .preInstructions([
        SystemProgram.transfer({
          fromPubkey: updateAuthority.publicKey,
          toPubkey: merchant2.publicKey,
          lamports: 0.5 * anchor.web3.LAMPORTS_PER_SOL,
        })
      ])
      .rpc();

    console.log(`✅ Book Store registered: ${registerMerchant2Tx}`);

    // Verify merchants were registered correctly
    const merchant1Account = await program.account.merchantAccount.fetch(merchant1AccountPda);
    const merchant2Account = await program.account.merchantAccount.fetch(merchant2AccountPda);
    
    expect(merchant1Account.cashbackRate).to.equal(500);
    expect(merchant1Account.isActive).to.be.true;
    expect(merchant2Account.cashbackRate).to.equal(300);
    expect(merchant2Account.isActive).to.be.true;

    console.log("\n=== 3. Create Customer Accounts ===");

    // Step 3: Create customers using update authority's SOL
    const customer1 = Keypair.generate();
    const customer2 = Keypair.generate();

    // Transfer SOL to customers for transaction fees
    await program.provider.sendAndConfirm(
      new anchor.web3.Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: updateAuthority.publicKey,
            toPubkey: customer1.publicKey,
            lamports: 1 * anchor.web3.LAMPORTS_PER_SOL,
          })
        )
        .add(
          SystemProgram.transfer({
            fromPubkey: updateAuthority.publicKey,
            toPubkey: customer2.publicKey,
            lamports: 1 * anchor.web3.LAMPORTS_PER_SOL,
          })
        ),
      [updateAuthority]
    );

    // Create token accounts for customers
    const customer1TokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer1.publicKey
    );
    const customer2TokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer2.publicKey
    );

    await program.provider.sendAndConfirm(
      new anchor.web3.Transaction()
        .add(
          createAssociatedTokenAccountInstruction(
            customer1.publicKey,
            customer1TokenAccount,
            customer1.publicKey,
            mintKeypair.publicKey
          )
        )
        .add(
          createAssociatedTokenAccountInstruction(
            customer2.publicKey,
            customer2TokenAccount,
            customer2.publicKey,
            mintKeypair.publicKey
          )
        ),
      [customer1, customer2]
    );

    console.log("✅ Customer accounts and token accounts created");

    console.log("\n=== 4. Test Purchase Workflow ===");

    // Step 4: Customer 1 makes purchase at Coffee Shop
    const purchase1Amount = new anchor.BN(50_000); // 50,000 IDR
    const transaction1Id = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transaction1RecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer1.publicKey.toBuffer(), Buffer.from(transaction1Id)],
      program.programId
    );

    const merchant1TokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      merchant1.publicKey
    );

    const customer1BalanceBefore = await getAccount(provider.connection, customer1TokenAccount);

    const purchase1Tx = await program.methods
      .processPurchase(purchase1Amount, null, transaction1Id)
      .accounts({
        customer: customer1.publicKey,
        merchantAccount: merchant1AccountPda,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        customerTokenAccount: customer1TokenAccount,
        merchantTokenAccount: merchant1TokenAccount,
        transactionRecord: transaction1RecordPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer1])
      .rpc();

    console.log(`✅ Purchase 1 processed: ${purchase1Tx}`);

    // Expected reward: 50,000 IDR * 5% = 2,500 IDR = 2.5 tokens = 2.5 * 10^9 token units
    const expectedReward1 = new anchor.BN(2_500_000_000);
    const customer1BalanceAfter = await getAccount(provider.connection, customer1TokenAccount);
    const rewardReceived1 = new anchor.BN(customer1BalanceAfter.amount.toString())
      .sub(new anchor.BN(customer1BalanceBefore.amount.toString()));

    expect(rewardReceived1.toString()).to.equal(expectedReward1.toString());
    console.log(`🎁 Customer 1 earned ${rewardReceived1.toString()} token units (${rewardReceived1.toNumber() / 10**9} tokens)`);

    console.log("\n=== 5. Test Token Redemption ===");

    // Step 5: Customer 1 makes another purchase and redeems tokens
    // First, create merchant 1's token account for receiving redeemed tokens
    await program.provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          merchant1.publicKey,
          merchant1TokenAccount,
          merchant1.publicKey,
          mintKeypair.publicKey
        )
      ),
      [merchant1]
    );

    const purchase2Amount = new anchor.BN(40_000); // 40,000 IDR
    const redeemAmount = new anchor.BN(1).mul(new anchor.BN(10**9)); // Redeem 1 token (worth 1,000 IDR)
    const transaction2Id = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transaction2RecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer1.publicKey.toBuffer(), Buffer.from(transaction2Id)],
      program.programId
    );

    const customer1BalanceBeforeRedemption = await getAccount(provider.connection, customer1TokenAccount);
    const merchant1BalanceBeforeRedemption = await getAccount(provider.connection, merchant1TokenAccount);

    const purchase2Tx = await program.methods
      .processPurchase(purchase2Amount, redeemAmount, transaction2Id)
      .accounts({
        customer: customer1.publicKey,
        merchantAccount: merchant1AccountPda,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        customerTokenAccount: customer1TokenAccount,
        merchantTokenAccount: merchant1TokenAccount,
        transactionRecord: transaction2RecordPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer1])
      .rpc();

    console.log(`✅ Purchase 2 with redemption processed: ${purchase2Tx}`);

    // Total value: 40,000 IDR (fiat) + 1,000 IDR (token) = 41,000 IDR
    // Expected reward: 41,000 * 5% = 2,050 IDR = 2.05 tokens
    const expectedReward2 = new anchor.BN(2_050_000_000);

    const customer1BalanceAfterRedemption = await getAccount(provider.connection, customer1TokenAccount);
    const merchant1BalanceAfterRedemption = await getAccount(provider.connection, merchant1TokenAccount);

    // Customer should have: previous balance - redeemed amount + new reward
    const expectedCustomerBalance = new anchor.BN(customer1BalanceBeforeRedemption.amount.toString())
      .sub(redeemAmount)
      .add(expectedReward2);
    
    expect(customer1BalanceAfterRedemption.amount.toString()).to.equal(expectedCustomerBalance.toString());
    expect(merchant1BalanceAfterRedemption.amount.toString()).to.equal(redeemAmount.toString());

    console.log(`💳 Customer 1 redeemed ${redeemAmount.toNumber() / 10**9} tokens`);
    console.log(`🎁 Customer 1 earned ${expectedReward2.toNumber() / 10**9} tokens as reward`);

    console.log("\n=== 6. Test Token Transfers ===");

    // Step 6: Customer 1 transfers tokens to Customer 2
    const transferAmount = new anchor.BN(1).mul(new anchor.BN(10**9)); // Transfer 1 token
    const transferId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const transferMemo = "Payment to friend";

    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), customer1.publicKey.toBuffer(), Buffer.from(transferId)],
      program.programId
    );

    const customer1BalanceBeforeTransfer = await getAccount(provider.connection, customer1TokenAccount);
    const customer2BalanceBeforeTransfer = await getAccount(provider.connection, customer2TokenAccount);

    const transferTx = await program.methods
      .transferTokens(transferAmount, transferId, transferMemo)
      .accounts({
        sender: customer1.publicKey,
        senderTokenAccount: customer1TokenAccount,
        recipientTokenAccount: customer2TokenAccount,
        transferRecord: transferRecordPda,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer1])
      .rpc();

    console.log(`✅ Transfer completed: ${transferTx}`);

    const customer1BalanceAfterTransfer = await getAccount(provider.connection, customer1TokenAccount);
    const customer2BalanceAfterTransfer = await getAccount(provider.connection, customer2TokenAccount);

    // Verify transfer balances
    const expectedCustomer1Balance = new anchor.BN(customer1BalanceBeforeTransfer.amount.toString()).sub(transferAmount);
    const expectedCustomer2Balance = new anchor.BN(customer2BalanceBeforeTransfer.amount.toString()).add(transferAmount);

    expect(customer1BalanceAfterTransfer.amount.toString()).to.equal(expectedCustomer1Balance.toString());
    expect(customer2BalanceAfterTransfer.amount.toString()).to.equal(expectedCustomer2Balance.toString());

    console.log(`💸 Successfully transferred ${transferAmount.toNumber() / 10**9} tokens from Customer 1 to Customer 2`);

    // Verify transfer record
    const transferRecord = await program.account.tokenTransfer.fetch(transferRecordPda);
    expect(transferRecord.amount.toString()).to.equal(transferAmount.toString());
    const memoStr = Buffer.from(transferRecord.memo).toString('utf-8').replace(/\0/g, '');
    expect(memoStr).to.equal(transferMemo);

    console.log("\n=== 7. Test Merchant Management ===");

    // Step 7: Update merchant settings
    const newCashbackRate = 750; // 7.5%
    
    const updateMerchantTx = await program.methods
      .updateMerchant(newCashbackRate, null)
      .accounts({
        merchantOwner: merchant1.publicKey,
        merchantAccount: merchant1AccountPda,
      })
      .signers([merchant1])
      .rpc();

    console.log(`✅ Merchant updated: ${updateMerchantTx}`);

    const updatedMerchant = await program.account.merchantAccount.fetch(merchant1AccountPda);
    expect(updatedMerchant.cashbackRate).to.equal(newCashbackRate);

    console.log(`⚙️  Coffee Shop cashback rate updated to ${newCashbackRate / 100}%`);

    console.log("\n=== 8. Verify Final State ===");

    // Step 8: Verify final state and statistics
    const finalConfig = await program.account.lokalMintConfig.fetch(configPda);
    const finalMerchant1 = await program.account.merchantAccount.fetch(merchant1AccountPda);
    
    console.log(`📊 Final Statistics:`);
    console.log(`   - Total token supply: ${finalConfig.totalSupply.toNumber() / 10**9} tokens`);
    console.log(`   - Coffee Shop transactions: ${finalMerchant1.totalTransactions.toNumber()}`);
    console.log(`   - Coffee Shop volume: ${finalMerchant1.totalVolume.toNumber()} IDR`);
    console.log(`   - Coffee Shop rewards distributed: ${finalMerchant1.totalRewardsDistributed.toNumber() / 10**9} tokens`);

    // Verify merchant statistics
    expect(finalMerchant1.totalTransactions.toNumber()).to.equal(2);
    expect(finalMerchant1.totalVolume.toNumber()).to.equal(91_000); // 50,000 + 41,000 (fiat + token value)
    
    console.log("\n🎉 All Carsa loyalty program functionality tests completed successfully!");
  });
});
