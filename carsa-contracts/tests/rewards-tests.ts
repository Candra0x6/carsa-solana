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
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

describe("Carsa Reward Distribution Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carsa as Program<Carsa>;
  
  // Test accounts
  let mintKeypair: Keypair;
  let updateAuthority: Keypair;

  // PDAs
  let mintAuthorityPda: PublicKey;
  let configPda: PublicKey;

  before(async () => {
    // Create test accounts
    mintKeypair = Keypair.generate();
    updateAuthority = Keypair.generate();

    // Airdrop SOL to update authority
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        updateAuthority.publicKey, 
        5 * anchor.web3.LAMPORTS_PER_SOL
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

    // Initialize the mint first
    await program.methods
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

    console.log("Mint initialized for rewards tests");
  });

  it("Successfully registers a new merchant", async () => {
    const merchantOwner = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    const merchantName = "Coffee Shop";
    const merchantCategory = "restaurant";
    const cashbackRate = 500; // 5%

    const tx = await program.methods
      .registerMerchant(merchantName, merchantCategory, cashbackRate)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    console.log("Register merchant transaction signature:", tx);

    // Verify merchant account was created correctly
    const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
    expect(merchantAccount.cashbackRate).to.equal(cashbackRate);
    expect(merchantAccount.isActive).to.be.true;
    expect(merchantAccount.merchantWallet.toBase58()).to.equal(merchantOwner.publicKey.toBase58());
    expect(merchantAccount.totalTransactions.toNumber()).to.equal(0);
    expect(merchantAccount.totalRewardsDistributed.toNumber()).to.equal(0);
    expect(merchantAccount.totalVolume.toNumber()).to.equal(0);

    // Verify name and category are stored correctly
    const nameStr = Buffer.from(merchantAccount.name).toString('utf-8').replace(/\0/g, '');
    const categoryStr = Buffer.from(merchantAccount.category).toString('utf-8').replace(/\0/g, '');
    expect(nameStr).to.equal(merchantName);
    expect(categoryStr).to.equal(merchantCategory);
  });

  it("Fails to register merchant with invalid cashback rate", async () => {
    const merchantOwner = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerMerchant("Bad Merchant", "retail", 10001) // > 100%
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOwner])
        .rpc();

      expect.fail("Should have failed with invalid cashback rate");
    } catch (error) {
      expect(error.toString()).to.include("InvalidCashbackRate");
    }
  });

  it("Fails to register merchant with empty name", async () => {
    const merchantOwner = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerMerchant("", "retail", 300)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOwner])
        .rpc();

      expect.fail("Should have failed with empty name");
    } catch (error) {
      expect(error.toString()).to.include("InvalidMerchantName");
    }
  });

  it("Successfully processes a purchase and distributes rewards", async () => {
    // Create a customer and merchant
    const customer = Keypair.generate();
    const merchantOwner = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    // Create customer's token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer.publicKey
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
      customer.publicKey,
      customerTokenAccount,
      customer.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createATAIx), [customer]);

    // Register merchant
    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerMerchant("Bookstore", "retail", 300) // 3% cashback
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    // Process purchase
    const fiatAmount = new anchor.BN(100_000); // 100,000 IDR
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transactionRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    // Create a placeholder merchant token account (for redemption validation)
    const merchantTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      merchantOwner.publicKey
    );

    const initialBalance = await getAccount(provider.connection, customerTokenAccount);
    
    const tx = await program.methods
      .processPurchase(fiatAmount, null, transactionId)
      .accounts({
        customer: customer.publicKey,
        merchantAccount: merchantAccountPda,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        customerTokenAccount: customerTokenAccount,
        merchantTokenAccount: merchantTokenAccount, // Will be validated during runtime if redemption occurs
        transactionRecord: transactionRecordPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();

    console.log("Process purchase transaction signature:", tx);

    // Calculate expected reward: 100,000 IDR * 3% = 3,000 IDR worth of tokens
    // Since 1 token = 1,000 IDR, expected reward = 3 tokens = 3 * 10^9 token units
    const expectedReward = new anchor.BN(3).mul(new anchor.BN(10**9));
    
    const finalBalance = await getAccount(provider.connection, customerTokenAccount);
    const rewardReceived = new anchor.BN(finalBalance.amount.toString()).sub(new anchor.BN(initialBalance.amount.toString()));
    
    expect(rewardReceived.toString()).to.equal(expectedReward.toString());

    // Verify transaction record
    const transactionRecord = await program.account.purchaseTransaction.fetch(transactionRecordPda);
    expect(transactionRecord.fiatAmount.toString()).to.equal(fiatAmount.toString());
    expect(transactionRecord.rewardAmount.toString()).to.equal(expectedReward.toString());
    expect(transactionRecord.cashbackRate).to.equal(300);
    expect(transactionRecord.usedTokens).to.be.false;
    expect(transactionRecord.redeemed_token_amount.toNumber()).to.equal(0);

    // Verify merchant statistics updated
    const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
    expect(merchantAccount.totalTransactions.toNumber()).to.equal(1);
    expect(merchantAccount.totalVolume.toString()).to.equal(fiatAmount.toString());
    expect(merchantAccount.totalRewardsDistributed.toString()).to.equal(expectedReward.toString());
  });

  it("Successfully processes a purchase with token redemption", async () => {
    // Create new customer and merchant for this test
    const customer = Keypair.generate();
    const merchantOwner = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    // Create customer's token account and mint some tokens to it first
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer.publicKey
    );

    const createCustomerATAIx = createAssociatedTokenAccountInstruction(
      customer.publicKey,
      customerTokenAccount,
      customer.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createCustomerATAIx), [customer]);

    // Mint some tokens to customer first
    const initialTokens = new anchor.BN(10).mul(new anchor.BN(10**9)); // 10 tokens
    await program.methods
      .mintLokalTokens(initialTokens)
      .accounts({
        authority: updateAuthority.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        destination: customerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([updateAuthority])
      .rpc();

    // Create merchant token account
    const merchantTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      merchantOwner.publicKey
    );

    const createMerchantATAIx = createAssociatedTokenAccountInstruction(
      merchantOwner.publicKey,
      merchantTokenAccount,
      merchantOwner.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createMerchantATAIx), [merchantOwner]);

    // Register merchant
    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerMerchant("Token Store", "retail", 400) // 4% cashback
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    // Process purchase with token redemption
    const fiatAmount = new anchor.BN(50_000); // 50,000 IDR
    const redeemTokens = new anchor.BN(5).mul(new anchor.BN(10**9)); // Redeem 5 tokens (worth 5,000 IDR)
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transactionRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    const initialCustomerBalance = await getAccount(provider.connection, customerTokenAccount);
    const initialMerchantBalance = await getAccount(provider.connection, merchantTokenAccount);
    
    const tx = await program.methods
      .processPurchase(fiatAmount, redeemTokens, transactionId)
      .accounts({
        customer: customer.publicKey,
        merchantAccount: merchantAccountPda,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        customerTokenAccount: customerTokenAccount,
        merchantTokenAccount: merchantTokenAccount,
        transactionRecord: transactionRecordPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();

    console.log("Process purchase with redemption transaction signature:", tx);

    // Total value = 50,000 IDR (fiat) + 5,000 IDR (token value) = 55,000 IDR
    // Expected reward = 55,000 * 4% = 2,200 IDR worth of tokens = 2.2 tokens = 2.2 * 10^9 token units
    const expectedReward = new anchor.BN(2_200_000_000); // 2.2 * 10^9

    const finalCustomerBalance = await getAccount(provider.connection, customerTokenAccount);
    const finalMerchantBalance = await getAccount(provider.connection, merchantTokenAccount);

    // Customer should have: initial - redeemed + reward
    const expectedCustomerBalance = new anchor.BN(initialCustomerBalance.amount.toString())
      .sub(redeemTokens)
      .add(expectedReward);
    expect(finalCustomerBalance.amount.toString()).to.equal(expectedCustomerBalance.toString());

    // Merchant should have received the redeemed tokens
    const expectedMerchantBalance = new anchor.BN(initialMerchantBalance.amount.toString()).add(redeemTokens);
    expect(finalMerchantBalance.amount.toString()).to.equal(expectedMerchantBalance.toString());

    // Verify transaction record
    const transactionRecord = await program.account.purchaseTransaction.fetch(transactionRecordPda);
    expect(transactionRecord.fiatAmount.toString()).to.equal(fiatAmount.toString());
    expect(transactionRecord.redeemedTokenAmount.toString()).to.equal(redeemTokens.toString());
    expect(transactionRecord.totalValue.toString()).to.equal("55000"); // 50,000 + 5,000
    expect(transactionRecord.rewardAmount.toString()).to.equal(expectedReward.toString());
    expect(transactionRecord.usedTokens).to.be.true;
  });

  it("Successfully updates merchant settings", async () => {
    const merchantOwner = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    // First register the merchant
    await program.methods
      .registerMerchant("Update Test", "service", 250) // 2.5%
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    // Update cashback rate
    const newCashbackRate = 750; // 7.5%
    await program.methods
      .updateMerchant(newCashbackRate, null)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
      })
      .signers([merchantOwner])
      .rpc();

    let merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
    expect(merchantAccount.cashbackRate).to.equal(newCashbackRate);
    expect(merchantAccount.isActive).to.be.true; // Should remain unchanged

    // Update active status
    await program.methods
      .updateMerchant(null, false)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
      })
      .signers([merchantOwner])
      .rpc();

    merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
    expect(merchantAccount.cashbackRate).to.equal(newCashbackRate); // Should remain unchanged
    expect(merchantAccount.isActive).to.be.false;
  });

  it("Fails to process purchase when merchant is inactive", async () => {
    // Create a customer and merchant
    const customer = Keypair.generate();
    const merchantOwner = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    // Create customer's token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer.publicKey
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
      customer.publicKey,
      customerTokenAccount,
      customer.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createATAIx), [customer]);

    // Register merchant and deactivate
    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerMerchant("Inactive Store", "retail", 200)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    // Deactivate merchant
    await program.methods
      .updateMerchant(null, false)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
      })
      .signers([merchantOwner])
      .rpc();

    // Try to process purchase with inactive merchant
    const fiatAmount = new anchor.BN(10_000);
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transactionRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      merchantOwner.publicKey
    );

    try {
      await program.methods
        .processPurchase(fiatAmount, null, transactionId)
        .accounts({
          customer: customer.publicKey,
          merchantAccount: merchantAccountPda,
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          customerTokenAccount: customerTokenAccount,
          merchantTokenAccount: merchantTokenAccount,
          transactionRecord: transactionRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([customer])
        .rpc();

      expect.fail("Should have failed with inactive merchant");
    } catch (error) {
      expect(error.toString()).to.include("MerchantNotActive");
    }
  });

  it("Fails to process purchase with insufficient balance for redemption", async () => {
    // Create a customer and merchant
    const customer = Keypair.generate();
    const merchantOwner = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    // Create customer's token account (but don't mint any tokens)
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      customer.publicKey
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
      customer.publicKey,
      customerTokenAccount,
      customer.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createATAIx), [customer]);

    // Create merchant token account  
    const merchantTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      merchantOwner.publicKey
    );

    const createMerchantATAIx = createAssociatedTokenAccountInstruction(
      merchantOwner.publicKey,
      merchantTokenAccount,
      merchantOwner.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createMerchantATAIx), [merchantOwner]);

    // Register merchant
    const [merchantAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerMerchant("Test Store", "retail", 300)
      .accounts({
        merchantOwner: merchantOwner.publicKey,
        merchantAccount: merchantAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOwner])
      .rpc();

    // Try to process purchase with token redemption but insufficient balance
    const fiatAmount = new anchor.BN(10_000);
    const redeemTokens = new anchor.BN(1).mul(new anchor.BN(10**9)); // Try to redeem 1 token
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transactionRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    try {
      await program.methods
        .processPurchase(fiatAmount, redeemTokens, transactionId)
        .accounts({
          customer: customer.publicKey,
          merchantAccount: merchantAccountPda,
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          customerTokenAccount: customerTokenAccount,
          merchantTokenAccount: merchantTokenAccount,
          transactionRecord: transactionRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([customer])
        .rpc();

      expect.fail("Should have failed with insufficient balance");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientBalance");
    }
  });
});
