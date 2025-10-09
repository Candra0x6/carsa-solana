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

describe("Carsa Essential Client Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carsa as Program<Carsa>;
  
  // Global test accounts - reused across tests
  let mintKeypair: Keypair;
  let updateAuthority: Keypair;
  let mintAuthorityPda: PublicKey;
  let configPda: PublicKey;

  before("Initialize program state", async () => {
    // Generate unique accounts to avoid conflicts
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

    console.log("Test setup completed");
    console.log("Mint:", mintKeypair.publicKey.toString());
    console.log("Config PDA:", configPda.toString());
    console.log("Mint Authority PDA:", mintAuthorityPda.toString());
  });

  describe("Mint Initialization", () => {
    it("Successfully initializes the Lokal mint configuration", async () => {
      const tx = await program.methods
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

      console.log("Initialize mint transaction signature:", tx);

      // Verify the mint was created correctly
      const mintInfo = await getMint(provider.connection, mintKeypair.publicKey);
      expect(mintInfo.decimals).to.equal(9);
      expect(mintInfo.mintAuthority?.toBase58()).to.equal(mintAuthorityPda.toBase58());
      expect(mintInfo.supply).to.equal(BigInt(0));

      // Verify the config account was created correctly
      const config = await program.account.lokalMintConfig.fetch(configPda);
      expect(config.mint.toBase58()).to.equal(mintKeypair.publicKey.toBase58());
      expect(config.updateAuthority.toBase58()).to.equal(updateAuthority.publicKey.toBase58());
      expect(config.totalSupply.toNumber()).to.equal(0);
    });

    it("Successfully mints tokens to a user account", async () => {
      const user = Keypair.generate();
      
      // Airdrop SOL to user
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(user.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Create user's associated token account
      const userAta = await getAssociatedTokenAddress(mintKeypair.publicKey, user.publicKey);
      
      const transaction = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          user.publicKey,
          userAta,
          user.publicKey,
          mintKeypair.publicKey
        )
      );
      
      await provider.sendAndConfirm(transaction, [user]);

      const mintAmount = new anchor.BN(1000).mul(new anchor.BN(10**9)); // 1000 tokens

      const tx = await program.methods
        .mintLokalTokens(mintAmount)
        .accounts({
          authority: updateAuthority.publicKey,
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([updateAuthority])
        .rpc();

      console.log("Mint tokens transaction signature:", tx);

      // Verify tokens were minted correctly
      const userAccount = await getAccount(provider.connection, userAta);
      expect(userAccount.amount.toString()).to.equal(mintAmount.toString());

      // Verify config was updated
      const config = await program.account.lokalMintConfig.fetch(configPda);
      expect(config.totalSupply.toString()).to.equal(mintAmount.toString());
    });
  });

  describe("Merchant Registration and Management", () => {
    it("Successfully registers a new merchant", async () => {
      const merchantOwner = Keypair.generate();
      
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );

      const [merchantAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
        program.programId
      );

      const merchantName = "Test Coffee Shop";
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

      // Verify name and category are stored correctly
      const nameStr = Buffer.from(merchantAccount.name).toString('utf-8').replace(/\0/g, '');
      const categoryStr = Buffer.from(merchantAccount.category).toString('utf-8').replace(/\0/g, '');
      expect(nameStr).to.equal(merchantName);
      expect(categoryStr).to.equal(merchantCategory);
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
        .registerMerchant("Update Test Shop", "service", 250) // 2.5%
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOwner])
        .rpc();

      // Update cashback rate and status
      const newCashbackRate = 750; // 7.5%
      await program.methods
        .updateMerchant(newCashbackRate, false) // Also deactivate
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();

      const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
      expect(merchantAccount.cashbackRate).to.equal(newCashbackRate);
      expect(merchantAccount.isActive).to.be.false;
    });
  });

  describe("Purchase Processing and Rewards", () => {
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
        .registerMerchant("Reward Test Store", "retail", 300) // 3% cashback
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
          merchantTokenAccount: merchantTokenAccount,
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

      // Verify merchant statistics updated
      const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
      expect(merchantAccount.totalTransactions.toNumber()).to.equal(1);
      expect(merchantAccount.totalVolume.toString()).to.equal(fiatAmount.toString());
      expect(merchantAccount.totalRewardsDistributed.toString()).to.equal(expectedReward.toString());
    });

    it("Successfully processes purchase with token redemption", async () => {
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

      // Create customer's token account and mint some tokens
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
        .registerMerchant("Token Redemption Store", "retail", 400) // 4% cashback
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
  });

  describe("Token Transfers", () => {
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
          sender: sender.publicKey,
          senderTokenAccount: senderTokenAccount,
          recipientTokenAccount: receiverTokenAccount,
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
  });
});
