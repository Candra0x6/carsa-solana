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

describe("Carsa Lokal Token Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carsa as Program<Carsa>;
  
  // Test accounts
  let mintKeypair: Keypair;
  let updateAuthority: Keypair;
  let user: Keypair;
  let userTokenAccount: PublicKey;

  // PDAs
  let mintAuthorityPda: PublicKey;
  let configPda: PublicKey;
  let mintAuthorityBump: number;
  let configBump: number;

  before(async () => {
    // Initialize test accounts
    mintKeypair = Keypair.generate();
    updateAuthority = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(updateAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Derive PDAs
    [mintAuthorityPda, mintAuthorityBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Get user's associated token account for the Lokal token
    userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      user.publicKey
    );
  });

  describe("Initialize Lokal Mint", () => {
    it("Successfully initializes the Lokal token mint and configuration", async () => {
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

      // Verify the mint was created with correct properties
      const mintInfo = await provider.connection.getParsedAccountInfo(mintKeypair.publicKey);
      expect(mintInfo.value).to.not.be.null;
      
      const mintData = mintInfo.value!.data as any;
      expect(mintData.parsed.info.decimals).to.equal(9);
      expect(mintData.parsed.info.mintAuthority).to.equal(mintAuthorityPda.toBase58());
      expect(mintData.parsed.info.freezeAuthority).to.equal(mintAuthorityPda.toBase58());

      // Verify the config account
      const configAccount = await program.account.lokalMintConfig.fetch(configPda);
      expect(configAccount.mint.toBase58()).to.equal(mintKeypair.publicKey.toBase58());
      expect(configAccount.updateAuthority.toBase58()).to.equal(updateAuthority.publicKey.toBase58());
      expect(configAccount.mintAuthorityBump).to.equal(mintAuthorityBump);
      expect(configAccount.configBump).to.equal(configBump);
      expect(configAccount.totalSupply.toNumber()).to.equal(0);
    });

    it("Fails if mint is already initialized", async () => {
      try {
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
        
        expect.fail("Should have thrown error for already initialized mint");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Mint Lokal Tokens", () => {
    before(async () => {
      // Create user's associated token account
      const createATAIx = createAssociatedTokenAccountInstruction(
        user.publicKey, // payer
        userTokenAccount, // ata
        user.publicKey, // owner
        mintKeypair.publicKey // mint
      );

      const tx = new anchor.web3.Transaction().add(createATAIx);
      await provider.sendAndConfirm(tx, [user]);
    });

    it("Successfully mints tokens to user account", async () => {
      const mintAmount = new anchor.BN(1000 * Math.pow(10, 9)); // 1000 tokens with 9 decimals

      const tx = await program.methods
        .mintLokalTokens(mintAmount)
        .accounts({
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Mint tokens transaction signature:", tx);

      // Verify tokens were minted
      const tokenAccountInfo = await getAccount(provider.connection, userTokenAccount);
      expect(tokenAccountInfo.amount.toString()).to.equal(mintAmount.toString());

      // Verify config total supply was updated
      const configAccount = await program.account.lokalMintConfig.fetch(configPda);
      expect(configAccount.totalSupply.toString()).to.equal(mintAmount.toString());
    });

    it("Successfully mints additional tokens", async () => {
      const additionalAmount = new anchor.BN(500 * Math.pow(10, 9)); // 500 more tokens
      const initialBalance = new anchor.BN(1000 * Math.pow(10, 9)); // Previous balance

      await program.methods
        .mintLokalTokens(additionalAmount)
        .accounts({
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Verify tokens were added
      const tokenAccountInfo = await getAccount(provider.connection, userTokenAccount);
      const expectedBalance = initialBalance.add(additionalAmount);
      expect(tokenAccountInfo.amount.toString()).to.equal(expectedBalance.toString());

      // Verify config total supply was updated
      const configAccount = await program.account.lokalMintConfig.fetch(configPda);
      expect(configAccount.totalSupply.toString()).to.equal(expectedBalance.toString());
    });

    it("Fails when minting zero tokens", async () => {
      try {
        await program.methods
          .mintLokalTokens(new anchor.BN(0))
          .accounts({
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthorityPda,
            config: configPda,
            destination: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        expect.fail("Should have thrown error for zero mint amount");
      } catch (error) {
        expect(error.message).to.include("InvalidMintAmount");
      }
    });

    it("Fails when minting amount exceeds maximum", async () => {
      const tooLargeAmount = new anchor.BN(11_000).mul(new anchor.BN(Math.pow(10, 9))); // > 10,000 tokens

      try {
        await program.methods
          .mintLokalTokens(tooLargeAmount)
          .accounts({
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthorityPda,
            config: configPda,
            destination: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        expect.fail("Should have thrown error for excessive mint amount");
      } catch (error) {
        expect(error.message).to.include("MintAmountTooLarge");
      }
    });

    it("Fails with wrong mint authority", async () => {
      const wrongAuthority = Keypair.generate();
      
      try {
        await program.methods
          .mintLokalTokens(new anchor.BN(100))
          .accounts({
            mint: mintKeypair.publicKey,
            mintAuthority: wrongAuthority.publicKey, // Wrong authority
            config: configPda,
            destination: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        expect.fail("Should have thrown error for wrong mint authority");
      } catch (error) {
        expect(error.message).to.include("seeds constraint");
      }
    });
  });

  describe("Merchant Registration", () => {
    let merchantOwner: Keypair;
    let merchantAccountPda: PublicKey;
    let merchantAccountBump: number;

    before(async () => {
      merchantOwner = Keypair.generate();
      
      // Airdrop SOL to merchant owner
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Derive merchant account PDA
      [merchantAccountPda, merchantAccountBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Successfully registers a new merchant", async () => {
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
      
      // Convert name bytes back to string for verification
      const nameStr = Buffer.from(merchantAccount.name).toString('utf8').replace(/\0+$/, '');
      const categoryStr = Buffer.from(merchantAccount.category).toString('utf8').replace(/\0+$/, '');
      
      expect(nameStr).to.equal(merchantName);
      expect(categoryStr).to.equal(merchantCategory);
      expect(merchantAccount.cashbackRate).to.equal(cashbackRate);
      expect(merchantAccount.isActive).to.be.true;
      expect(merchantAccount.totalTransactions.toNumber()).to.equal(0);
      expect(merchantAccount.totalRewardsDistributed.toNumber()).to.equal(0);
      expect(merchantAccount.totalVolume.toNumber()).to.equal(0);
      expect(merchantAccount.merchantWallet.toBase58()).to.equal(merchantOwner.publicKey.toBase58());
    });

    it("Fails to register merchant with invalid cashback rate", async () => {
      const newMerchant = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(newMerchant.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      const [newMerchantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), newMerchant.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .registerMerchant("Test Merchant", "test", 15000) // 150% - invalid
          .accounts({
            merchantOwner: newMerchant.publicKey,
            merchantAccount: newMerchantPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([newMerchant])
          .rpc();
        
        expect.fail("Should have thrown error for invalid cashback rate");
      } catch (error) {
        expect(error.message).to.include("InvalidCashbackRate");
      }
    });

    it("Successfully updates merchant settings", async () => {
      const newCashbackRate = 750; // 7.5%
      
      await program.methods
        .updateMerchant(newCashbackRate, false)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();

      const updatedMerchant = await program.account.merchantAccount.fetch(merchantAccountPda);
      expect(updatedMerchant.cashbackRate).to.equal(newCashbackRate);
      expect(updatedMerchant.isActive).to.be.false;
    });
  });

  describe("Purchase Processing and Reward Distribution", () => {
    let customer: Keypair;
    let customerTokenAccount: PublicKey;
    let merchantOwner: Keypair;
    let merchantAccountPda: PublicKey;

    before(async () => {
      customer = Keypair.generate();
      merchantOwner = Keypair.generate();

      // Airdrop SOL
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Create customer's associated token account
      customerTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        customer.publicKey
      );

      const createATAIx = createAssociatedTokenAccountInstruction(
        customer.publicKey,
        customerTokenAccount,
        customer.publicKey,
        mintKeypair.publicKey
      );

      const tx = new anchor.web3.Transaction().add(createATAIx);
      await provider.sendAndConfirm(tx, [customer]);

      // Register a new active merchant
      [merchantAccountPda] = PublicKey.findProgramAddressSync(
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
    });

    it("Successfully processes purchase and distributes rewards", async () => {
      const purchaseAmount = new anchor.BN(5 * anchor.web3.LAMPORTS_PER_SOL); // 5 SOL purchase
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      // Derive transaction record PDA
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

      // Check reward calculation: 5 SOL * 3% = 0.15 SOL worth of tokens
      const expectedReward = purchaseAmount.mul(new anchor.BN(300)).div(new anchor.BN(10000)).mul(new anchor.BN(1_000_000_000)); // Convert to token units
      
      const finalBalance = await getAccount(provider.connection, customerTokenAccount);
      const rewardReceived = new anchor.BN(finalBalance.amount.toString()).sub(new anchor.BN(initialBalance.amount.toString()));
      
      expect(rewardReceived.toString()).to.equal(expectedReward.toString());

      // Verify transaction record
      const transactionRecord = await program.account.purchaseTransaction.fetch(transactionRecordPda);
      expect(transactionRecord.customer.toBase58()).to.equal(customer.publicKey.toBase58());
      expect(transactionRecord.merchant.toBase58()).to.equal(merchantAccountPda.toBase58());
      expect(transactionRecord.purchaseAmount.toString()).to.equal(purchaseAmount.toString());
      expect(transactionRecord.rewardAmount.toString()).to.equal(expectedReward.toString());
      expect(transactionRecord.cashbackRate).to.equal(300);

      // Verify merchant stats were updated
      const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
      expect(merchantAccount.totalTransactions.toNumber()).to.equal(1);
      expect(merchantAccount.totalVolume.toString()).to.equal(purchaseAmount.toString());
      expect(merchantAccount.totalRewardsDistributed.toString()).to.equal(expectedReward.toString());
    });

    it("Fails to process purchase for inactive merchant", async () => {
      // Deactivate the merchant first
      await program.methods
        .updateMerchant(null, false)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();

      const purchaseAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [transactionRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      try {
        await program.methods
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

        expect.fail("Should have thrown error for inactive merchant");
      } catch (error) {
        expect(error.message).to.include("MerchantNotActive");
      }
    });

    it("Fails to process purchase with zero amount", async () => {
      // Reactivate merchant
      await program.methods
        .updateMerchant(null, true)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();

      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [transactionRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transaction"), customer.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      try {
        await program.methods
          .processPurchase(new anchor.BN(0), transactionId)
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

        expect.fail("Should have thrown error for zero purchase amount");
      } catch (error) {
        expect(error.message).to.include("InvalidPurchaseAmount");
      }
    });
  });

  describe("Token Transfer Tests", () => {
    let recipient: Keypair;
    let recipientTokenAccount: PublicKey;
    let sender: Keypair;
    let senderTokenAccount: PublicKey;

    before(async () => {
      // Create sender and recipient accounts
      sender = Keypair.generate();
      recipient = Keypair.generate();
      
      // Airdrop SOL to both accounts
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(sender.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(recipient.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Create associated token accounts
      senderTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        sender.publicKey
      );

      recipientTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        recipient.publicKey
      );

      // Create sender's token account
      const createSenderTokenAccountIx = createAssociatedTokenAccountInstruction(
        sender.publicKey,
        senderTokenAccount,
        sender.publicKey,
        mintKeypair.publicKey
      );

      // Create recipient's token account
      const createRecipientTokenAccountIx = createAssociatedTokenAccountInstruction(
        recipient.publicKey,
        recipientTokenAccount,
        recipient.publicKey,
        mintKeypair.publicKey
      );

      const senderTokenAccountTx = new anchor.web3.Transaction().add(createSenderTokenAccountIx);
      await provider.sendAndConfirm(senderTokenAccountTx, [sender]);

      const recipientTokenAccountTx = new anchor.web3.Transaction().add(createRecipientTokenAccountIx);
      await provider.sendAndConfirm(recipientTokenAccountTx, [recipient]);

      // Mint some tokens to sender for testing transfers
      const mintAmount = new anchor.BN(5000 * Math.pow(10, 9)); // 5000 tokens
      await program.methods
        .mintLokalTokens(mintAmount)
        .accounts({
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: senderTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    });

    it("Successfully transfers tokens between users", async () => {
      const transferAmount = new anchor.BN(1_000_000_000); // 1 token with 9 decimals
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const memo = "Test transfer";
      
      const [transferRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      // Get initial balances
      const initialSenderBalance = (await getAccount(provider.connection, senderTokenAccount)).amount;
      const initialRecipientBalance = (await getAccount(provider.connection, recipientTokenAccount)).amount;

      const tx = await program.methods
        .transferTokens(transferAmount, transactionId, memo)
        .accounts({
          sender: sender.publicKey,
          senderTokenAccount: senderTokenAccount,
          recipientTokenAccount: recipientTokenAccount,
          config: configPda,
          transferRecord: transferRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      console.log("Transfer tokens transaction signature:", tx);

      // Verify balances after transfer
      const finalSenderBalance = (await getAccount(provider.connection, senderTokenAccount)).amount;
      const finalRecipientBalance = (await getAccount(provider.connection, recipientTokenAccount)).amount;

      expect(Number(finalSenderBalance)).to.equal(Number(initialSenderBalance) - transferAmount.toNumber());
      expect(Number(finalRecipientBalance)).to.equal(Number(initialRecipientBalance) + transferAmount.toNumber());

      // Verify transfer record
      const transferRecord = await program.account.tokenTransfer.fetch(transferRecordPda);
      expect(transferRecord.from.toBase58()).to.equal(sender.publicKey.toBase58());
      expect(transferRecord.to.toBase58()).to.equal(recipient.publicKey.toBase58());
      expect(transferRecord.amount.toNumber()).to.equal(transferAmount.toNumber());
      expect(transferRecord.transactionId).to.deep.equal(transactionId);
      
      // Verify memo
      const memoStr = Buffer.from(transferRecord.memo).toString('utf8').replace(/\0+$/, '');
      expect(memoStr).to.equal(memo);
    });

    it("Fails to transfer with insufficient balance", async () => {
      const excessiveAmount = new anchor.BN(10_000_000_000_000); // 10,000 tokens (more than available)
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const memo = "Excessive transfer";
      
      const [transferRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      try {
        await program.methods
          .transferTokens(excessiveAmount, transactionId, memo)
          .accounts({
            sender: sender.publicKey,
            senderTokenAccount: senderTokenAccount,
            recipientTokenAccount: recipientTokenAccount,
            config: configPda,
            transferRecord: transferRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([sender])
          .rpc();

        expect.fail("Should have thrown error for insufficient balance");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });

    it("Fails to transfer zero amount", async () => {
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const memo = "Zero transfer";
      
      const [transferRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      try {
        await program.methods
          .transferTokens(new anchor.BN(0), transactionId, memo)
          .accounts({
            sender: sender.publicKey,
            senderTokenAccount: senderTokenAccount,
            recipientTokenAccount: recipientTokenAccount,
            config: configPda,
            transferRecord: transferRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([sender])
          .rpc();

        expect.fail("Should have thrown error for zero transfer amount");
      } catch (error) {
        expect(error.message).to.include("InvalidTransferAmount");
      }
    });

    it("Fails to transfer to same account (self-transfer)", async () => {
      const transferAmount = new anchor.BN(500_000_000); // 0.5 tokens
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const memo = "Self transfer";
      
      const [transferRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer"), sender.publicKey.toBuffer(), Buffer.from(transactionId)],
        program.programId
      );

      try {
        await program.methods
          .transferTokens(transferAmount, transactionId, memo)
          .accounts({
            sender: sender.publicKey,
            senderTokenAccount: senderTokenAccount,
            recipientTokenAccount: senderTokenAccount, // Same as sender
            config: configPda,
            transferRecord: transferRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([sender])
          .rpc();

        expect.fail("Should have thrown error for self-transfer");
      } catch (error) {
        expect(error.message).to.include("SelfTransferNotAllowed");
      }
    });
  });

  describe("Token Redemption Tests", () => {
    let customer: Keypair;
    let customerTokenAccount: PublicKey;
    let merchantOwner: Keypair;
    let merchantAccountPda: PublicKey;
    let merchantTokenAccount: PublicKey;

    before(async () => {
      // Create customer and merchant accounts
      customer = Keypair.generate();
      merchantOwner = Keypair.generate();
      
      // Airdrop SOL
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(customer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Create associated token accounts
      customerTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        customer.publicKey
      );

      merchantTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        merchantOwner.publicKey
      );

      // Create customer's token account
      const createCustomerTokenAccountIx = createAssociatedTokenAccountInstruction(
        customer.publicKey,
        customerTokenAccount,
        customer.publicKey,
        mintKeypair.publicKey
      );

      // Create merchant's token account
      const createMerchantTokenAccountIx = createAssociatedTokenAccountInstruction(
        merchantOwner.publicKey,
        merchantTokenAccount,
        merchantOwner.publicKey,
        mintKeypair.publicKey
      );

      const customerTokenAccountTx = new anchor.web3.Transaction().add(createCustomerTokenAccountIx);
      await provider.sendAndConfirm(customerTokenAccountTx, [customer]);

      const merchantTokenAccountTx = new anchor.web3.Transaction().add(createMerchantTokenAccountIx);
      await provider.sendAndConfirm(merchantTokenAccountTx, [merchantOwner]);

      // Register merchant
      [merchantAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerMerchant("Redemption Store", "retail", 500) // 5% cashback
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOwner])
        .rpc();

      // Mint tokens to customer for redemption tests
      const mintAmount = new anchor.BN(2000 * Math.pow(10, 9)); // 2000 tokens
      await program.methods
        .mintLokalTokens(mintAmount)
        .accounts({
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: customerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    });

    it("Successfully redeems tokens at merchant", async () => {
      const tokenAmount = new anchor.BN(500_000_000); // 0.5 tokens with 9 decimals
      const fiatValue = new anchor.BN(5_000_000_000); // $5 equivalent in lamports
      const discountRate = 1000; // 10%
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [redemptionRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption"), 
          customer.publicKey.toBuffer(), 
          merchantAccountPda.toBuffer(),
          Buffer.from(transactionId)
        ],
        program.programId
      );

      // Get initial balances
      const initialCustomerBalance = (await getAccount(provider.connection, customerTokenAccount)).amount;
      const initialMerchantBalance = (await getAccount(provider.connection, merchantTokenAccount)).amount;
      
      // Get initial merchant stats
      const initialMerchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);

      const tx = await program.methods
        .redeemTokens(tokenAmount, fiatValue, discountRate, transactionId)
        .accounts({
          customer: customer.publicKey,
          customerTokenAccount: customerTokenAccount,
          merchantAccount: merchantAccountPda,
          merchantTokenAccount: merchantTokenAccount,
          config: configPda,
          redemptionRecord: redemptionRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([customer])
        .rpc();

      console.log("Redeem tokens transaction signature:", tx);

      // Verify balances after redemption
      const finalCustomerBalance = (await getAccount(provider.connection, customerTokenAccount)).amount;
      const finalMerchantBalance = (await getAccount(provider.connection, merchantTokenAccount)).amount;

      expect(Number(finalCustomerBalance)).to.equal(Number(initialCustomerBalance) - tokenAmount.toNumber());
      expect(Number(finalMerchantBalance)).to.equal(Number(initialMerchantBalance) + tokenAmount.toNumber());

      // Verify redemption record
      const redemptionRecord = await program.account.tokenRedemption.fetch(redemptionRecordPda);
      expect(redemptionRecord.customer.toBase58()).to.equal(customer.publicKey.toBase58());
      expect(redemptionRecord.merchant.toBase58()).to.equal(merchantAccountPda.toBase58());
      expect(redemptionRecord.tokenAmount.toNumber()).to.equal(tokenAmount.toNumber());
      expect(redemptionRecord.fiatValue.toNumber()).to.equal(fiatValue.toNumber());
      expect(redemptionRecord.discountRate).to.equal(discountRate);
      expect(redemptionRecord.transactionId).to.deep.equal(transactionId);

      // Verify merchant stats updated
      const finalMerchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
      expect(finalMerchantAccount.totalTransactions.toNumber()).to.equal(
        initialMerchantAccount.totalTransactions.toNumber() + 1
      );
      expect(finalMerchantAccount.totalVolume.toNumber()).to.equal(
        initialMerchantAccount.totalVolume.toNumber() + fiatValue.toNumber()
      );
    });

    it("Fails to redeem at inactive merchant", async () => {
      // Deactivate merchant
      await program.methods
        .updateMerchant(null, false)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();

      const tokenAmount = new anchor.BN(100_000_000); // 0.1 tokens
      const fiatValue = new anchor.BN(1_000_000_000); // $1 equivalent
      const discountRate = 500; // 5%
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [redemptionRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption"), 
          customer.publicKey.toBuffer(), 
          merchantAccountPda.toBuffer(),
          Buffer.from(transactionId)
        ],
        program.programId
      );

      try {
        await program.methods
          .redeemTokens(tokenAmount, fiatValue, discountRate, transactionId)
          .accounts({
            customer: customer.publicKey,
            customerTokenAccount: customerTokenAccount,
            merchantAccount: merchantAccountPda,
            merchantTokenAccount: merchantTokenAccount,
            config: configPda,
            redemptionRecord: redemptionRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        expect.fail("Should have thrown error for inactive merchant");
      } catch (error) {
        expect(error.message).to.include("RedemptionMerchantNotActive");
      }

      // Reactivate merchant for subsequent tests
      await program.methods
        .updateMerchant(null, true)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
        })
        .signers([merchantOwner])
        .rpc();
    });

    it("Fails to redeem zero amount", async () => {
      const fiatValue = new anchor.BN(1_000_000_000); // $1 equivalent
      const discountRate = 500; // 5%
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [redemptionRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption"), 
          customer.publicKey.toBuffer(), 
          merchantAccountPda.toBuffer(),
          Buffer.from(transactionId)
        ],
        program.programId
      );

      try {
        await program.methods
          .redeemTokens(new anchor.BN(0), fiatValue, discountRate, transactionId)
          .accounts({
            customer: customer.publicKey,
            customerTokenAccount: customerTokenAccount,
            merchantAccount: merchantAccountPda,
            merchantTokenAccount: merchantTokenAccount,
            config: configPda,
            redemptionRecord: redemptionRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        expect.fail("Should have thrown error for zero redemption amount");
      } catch (error) {
        expect(error.message).to.include("InvalidRedemptionAmount");
      }
    });

    it("Fails to redeem with invalid discount rate", async () => {
      const tokenAmount = new anchor.BN(100_000_000); // 0.1 tokens
      const fiatValue = new anchor.BN(1_000_000_000); // $1 equivalent
      const invalidDiscountRate = 15000; // 150% - invalid
      const transactionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const [redemptionRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption"), 
          customer.publicKey.toBuffer(), 
          merchantAccountPda.toBuffer(),
          Buffer.from(transactionId)
        ],
        program.programId
      );

      try {
        await program.methods
          .redeemTokens(tokenAmount, fiatValue, invalidDiscountRate, transactionId)
          .accounts({
            customer: customer.publicKey,
            customerTokenAccount: customerTokenAccount,
            merchantAccount: merchantAccountPda,
            merchantTokenAccount: merchantTokenAccount,
            config: configPda,
            redemptionRecord: redemptionRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        expect.fail("Should have thrown error for invalid discount rate");
      } catch (error) {
        expect(error.message).to.include("InvalidDiscountPercentage");
      }
    });
  });

  describe("Token Burn Tests", () => {
    let merchantOwner: Keypair;
    let merchantAccountPda: PublicKey;
    let merchantTokenAccount: PublicKey;

    before(async () => {
      merchantOwner = Keypair.generate();
      
      // Airdrop SOL
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(merchantOwner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );

      // Create merchant token account
      merchantTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        merchantOwner.publicKey
      );

      const createMerchantTokenAccountIx = createAssociatedTokenAccountInstruction(
        merchantOwner.publicKey,
        merchantTokenAccount,
        merchantOwner.publicKey,
        mintKeypair.publicKey
      );

      const merchantTokenAccountTx = new anchor.web3.Transaction().add(createMerchantTokenAccountIx);
      await provider.sendAndConfirm(merchantTokenAccountTx, [merchantOwner]);

      // Register merchant
      [merchantAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), merchantOwner.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerMerchant("Burn Test Merchant", "test", 100) // 1% cashback
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOwner])
        .rpc();

      // Mint tokens to merchant for burn tests
      const mintAmount = new anchor.BN(1000 * Math.pow(10, 9)); // 1000 tokens
      await program.methods
        .mintLokalTokens(mintAmount)
        .accounts({
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          destination: merchantTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    });

    it("Successfully burns tokens", async () => {
      const burnAmount = new anchor.BN(100_000_000); // 0.1 tokens with 9 decimals

      // Get initial balances and supply
      const initialMerchantBalance = (await getAccount(provider.connection, merchantTokenAccount)).amount;
      const initialConfig = await program.account.lokalMintConfig.fetch(configPda);

      const tx = await program.methods
        .burnTokens(burnAmount)
        .accounts({
          merchantOwner: merchantOwner.publicKey,
          merchantAccount: merchantAccountPda,
          merchantTokenAccount: merchantTokenAccount,
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthorityPda,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([merchantOwner])
        .rpc();

      console.log("Burn tokens transaction signature:", tx);

      // Verify balance after burn
      const finalMerchantBalance = (await getAccount(provider.connection, merchantTokenAccount)).amount;
      expect(Number(finalMerchantBalance)).to.equal(Number(initialMerchantBalance) - burnAmount.toNumber());

      // Verify total supply decreased
      const finalConfig = await program.account.lokalMintConfig.fetch(configPda);
      const expectedSupply = new anchor.BN(initialConfig.totalSupply.toString()).sub(burnAmount);
      expect(finalConfig.totalSupply.toString()).to.equal(expectedSupply.toString());
    });

    it("Fails to burn more tokens than available", async () => {
      const excessiveBurnAmount = new anchor.BN(10_000_000_000_000); // 10,000 tokens (more than available)

      try {
        await program.methods
          .burnTokens(excessiveBurnAmount)
          .accounts({
            merchantOwner: merchantOwner.publicKey,
            merchantAccount: merchantAccountPda,
            merchantTokenAccount: merchantTokenAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthorityPda,
            config: configPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([merchantOwner])
          .rpc();

        expect.fail("Should have thrown error for insufficient balance");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });

    it("Fails to burn zero amount", async () => {
      try {
        await program.methods
          .burnTokens(new anchor.BN(0))
          .accounts({
            merchantOwner: merchantOwner.publicKey,
            merchantAccount: merchantAccountPda,
            merchantTokenAccount: merchantTokenAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthorityPda,
            config: configPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([merchantOwner])
          .rpc();

        expect.fail("Should have thrown error for zero burn amount");
      } catch (error) {
        expect(error.message).to.include("InvalidMintAmount");
      }
    });
  });

  describe("Legacy Initialize Function", () => {
    it("Legacy initialize function still works", async () => {
      const tx = await program.methods.initialize().rpc();
      console.log("Legacy initialize transaction signature:", tx);
      // This should just log a deprecation message
    });
  });
});
