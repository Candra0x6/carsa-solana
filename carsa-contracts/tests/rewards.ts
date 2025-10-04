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
    // Use the same mint and authorities from the first test suite
    // This avoids duplicate initialization
    
    // Derive PDAs
    [mintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      // Try to fetch the config to see if mint is already initialized
      const config = await program.account.lokalMintConfig.fetch(configPda);
      mintKeypair = { publicKey: config.mint } as Keypair;
      console.log("Using existing mint:", config.mint.toString());
    } catch (error) {
      // If config doesn't exist, we need to initialize
      mintKeypair = Keypair.generate();
      updateAuthority = Keypair.generate();

      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(updateAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );

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
    }
  });

  it("Successfully registers a new merchant", async () => {
    const merchantOwner = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchantOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
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
  });

  it("Successfully processes a purchase and distributes rewards", async () => {
    // Create a customer and merchant
    const customer = Keypair.generate();
    const merchantOwner = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
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
    const purchaseAmount = new anchor.BN(5 * anchor.web3.LAMPORTS_PER_SOL); // 5 SOL purchase
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

    const [transactionRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    const initialBalance = await getAccount(provider.connection, customerTokenAccount);
    
    const tx = await program.methods
      .processPurchase(purchaseAmount, transactionId)
      .accounts({
        customer: customer.publicKey,
        merchantAccount: merchantAccountPda,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        customerTokenAccount: customerTokenAccount,
        transactionRecord: transactionRecordPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();

    console.log("Process purchase transaction signature:", tx);

    // Verify rewards were distributed correctly
    // 5 SOL * 3% = 0.15 SOL worth of tokens
    const expectedReward = purchaseAmount.mul(new anchor.BN(300)).div(new anchor.BN(10000)).mul(new anchor.BN(1_000_000_000));
    
    const finalBalance = await getAccount(provider.connection, customerTokenAccount);
    const rewardReceived = new anchor.BN(finalBalance.amount.toString()).sub(new anchor.BN(initialBalance.amount.toString()));
    
    expect(rewardReceived.toString()).to.equal(expectedReward.toString());

    // Verify transaction record
    const transactionRecord = await program.account.purchaseTransaction.fetch(transactionRecordPda);
    expect(transactionRecord.purchaseAmount.toString()).to.equal(purchaseAmount.toString());
    expect(transactionRecord.rewardAmount.toString()).to.equal(expectedReward.toString());
    expect(transactionRecord.cashbackRate).to.equal(300);
  });
});
