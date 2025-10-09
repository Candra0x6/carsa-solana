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

describe("Carsa Token Transfer Tests", () => {
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

    console.log("Mint initialized for transfer tests");
  });

  it("Successfully transfers tokens between users", async () => {
    // Create sender and receiver
    const sender = Keypair.generate();
    const receiver = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(sender.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(receiver.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    // Create token accounts for both users
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      sender.publicKey
    );

    const receiverTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      receiver.publicKey
    );

    // Create sender's ATA
    const createSenderATAIx = createAssociatedTokenAccountInstruction(
      sender.publicKey,
      senderTokenAccount,
      sender.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createSenderATAIx), [sender]);

    // Create receiver's ATA
    const createReceiverATAIx = createAssociatedTokenAccountInstruction(
      receiver.publicKey,
      receiverTokenAccount,
      receiver.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createReceiverATAIx), [receiver]);

    // Mint some tokens to sender first
    const initialTokens = new anchor.BN(100).mul(new anchor.BN(10**9)); // 100 tokens
    await program.methods
      .mintLokalTokens(initialTokens)
      .accounts({
        authority: updateAuthority.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        destination: senderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([updateAuthority])
      .rpc();

    // Transfer tokens from sender to receiver
    const transferAmount = new anchor.BN(25).mul(new anchor.BN(10**9)); // 25 tokens
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const memo = "Test transfer payment";

    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    const senderInitialBalance = await getAccount(provider.connection, senderTokenAccount);
    const receiverInitialBalance = await getAccount(provider.connection, receiverTokenAccount);

    const tx = await program.methods
      .transferTokens(transferAmount, transactionId, memo)
      .accounts({
        from: sender.publicKey,
        fromTokenAccount: senderTokenAccount,
        toTokenAccount: receiverTokenAccount,
        transferRecord: transferRecordPda,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    console.log("Transfer tokens transaction signature:", tx);

    // Verify balances after transfer
    const senderFinalBalance = await getAccount(provider.connection, senderTokenAccount);
    const receiverFinalBalance = await getAccount(provider.connection, receiverTokenAccount);

    const expectedSenderBalance = new anchor.BN(senderInitialBalance.amount.toString()).sub(transferAmount);
    const expectedReceiverBalance = new anchor.BN(receiverInitialBalance.amount.toString()).add(transferAmount);

    expect(senderFinalBalance.amount.toString()).to.equal(expectedSenderBalance.toString());
    expect(receiverFinalBalance.amount.toString()).to.equal(expectedReceiverBalance.toString());

    // Verify transfer record
    const transferRecord = await program.account.tokenTransfer.fetch(transferRecordPda);
    expect(transferRecord.from.toBase58()).to.equal(sender.publicKey.toBase58());
    expect(transferRecord.to.toBase58()).to.equal(receiverTokenAccount.toString());
    expect(transferRecord.amount.toString()).to.equal(transferAmount.toString());

    // Verify memo
    const memoStr = Buffer.from(transferRecord.memo).toString('utf-8').replace(/\0/g, '');
    expect(memoStr).to.equal(memo);
  });

  it("Fails to transfer zero tokens", async () => {
    const sender = Keypair.generate();
    const receiver = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(sender.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(receiver.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    const senderTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      sender.publicKey
    );
    const receiverTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      receiver.publicKey
    );

    // Create token accounts
    const createSenderATAIx = createAssociatedTokenAccountInstruction(
      sender.publicKey,
      senderTokenAccount,
      sender.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createSenderATAIx), [sender]);

    const createReceiverATAIx = createAssociatedTokenAccountInstruction(
      receiver.publicKey,
      receiverTokenAccount,
      receiver.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createReceiverATAIx), [receiver]);

    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    try {
      await program.methods
        .transferTokens(new anchor.BN(0), transactionId, "Zero transfer")
        .accounts({
          from: sender.publicKey,
          fromTokenAccount: senderTokenAccount,
          toTokenAccount: receiverTokenAccount,
          transferRecord: transferRecordPda,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      expect.fail("Should have failed to transfer zero tokens");
    } catch (error) {
      expect(error.toString()).to.include("InvalidTransferAmount");
    }
  });

  it("Fails to transfer more tokens than available balance", async () => {
    const sender = Keypair.generate();
    const receiver = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(sender.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(receiver.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    const senderTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      sender.publicKey
    );
    const receiverTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      receiver.publicKey
    );

    // Create token accounts
    const createSenderATAIx = createAssociatedTokenAccountInstruction(
      sender.publicKey,
      senderTokenAccount,
      sender.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createSenderATAIx), [sender]);

    const createReceiverATAIx = createAssociatedTokenAccountInstruction(
      receiver.publicKey,
      receiverTokenAccount,
      receiver.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createReceiverATAIx), [receiver]);

    // Mint only a small amount to sender
    const smallAmount = new anchor.BN(1).mul(new anchor.BN(10**9)); // 1 token
    await program.methods
      .mintLokalTokens(smallAmount)
      .accounts({
        authority: updateAuthority.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        destination: senderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([updateAuthority])
      .rpc();

    // Try to transfer more than balance
    const excessiveAmount = new anchor.BN(5).mul(new anchor.BN(10**9)); // 5 tokens (more than balance)
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    try {
      await program.methods
        .transferTokens(excessiveAmount, transactionId, "Excessive transfer")
        .accounts({
          from: sender.publicKey,
          fromTokenAccount: senderTokenAccount,
          toTokenAccount: receiverTokenAccount,
          transferRecord: transferRecordPda,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      expect.fail("Should have failed to transfer excessive amount");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientBalance");
    }
  });

  it("Fails to transfer to same account", async () => {
    const user = Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      user.publicKey
    );

    // Create token account
    const createATAIx = createAssociatedTokenAccountInstruction(
      user.publicKey,
      userTokenAccount,
      user.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createATAIx), [user]);

    const transferAmount = new anchor.BN(1).mul(new anchor.BN(10**9)); // 1 token
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), user.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    try {
      await program.methods
        .transferTokens(transferAmount, transactionId, "Self transfer")
        .accounts({
          from: user.publicKey,
          fromTokenAccount: userTokenAccount,
          toTokenAccount: userTokenAccount, // Same account
          transferRecord: transferRecordPda,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      expect.fail("Should have failed to transfer to same account");
    } catch (error) {
      expect(error.toString()).to.include("SelfTransferNotAllowed");
    }
  });

  it("Fails to transfer excessive amount beyond maximum per transaction", async () => {
    const sender = Keypair.generate();
    const receiver = Keypair.generate();
    
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(sender.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(receiver.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      )
    ]);

    const senderTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      sender.publicKey
    );
    const receiverTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      receiver.publicKey
    );

    // Create token accounts
    const createSenderATAIx = createAssociatedTokenAccountInstruction(
      sender.publicKey,
      senderTokenAccount,
      sender.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createSenderATAIx), [sender]);

    const createReceiverATAIx = createAssociatedTokenAccountInstruction(
      receiver.publicKey,
      receiverTokenAccount,
      receiver.publicKey,
      mintKeypair.publicKey
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createReceiverATAIx), [receiver]);

    // Try to transfer more than maximum allowed per transaction
    // Maximum is typically 100,000 tokens per transaction
    const excessiveAmount = new anchor.BN(100_001).mul(new anchor.BN(10**9)); // > 100,000 tokens
    const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const [transferRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
      program.programId
    );

    try {
      await program.methods
        .transferTokens(excessiveAmount, transactionId, "Excessive amount")
        .accounts({
          from: sender.publicKey,
          fromTokenAccount: senderTokenAccount,
          toTokenAccount: receiverTokenAccount,
          transferRecord: transferRecordPda,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      expect.fail("Should have failed to transfer excessive amount");
    } catch (error) {
      expect(error.toString()).to.include("TransferAmountTooLarge");
    }
  });
});
