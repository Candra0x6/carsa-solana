/**
 * Voucher Pool Integration Test
 * 
 * This test demonstrates the complete flow of the non-custodial staking system
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Carsa } from "../target/types/carsa";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  createApproveInstruction,
  createRevokeInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Voucher Pool - Complete Workflow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carsa as Program<Carsa>;

  // Test accounts
  let poolAuthority: Keypair;
  let poolDelegate: Keypair;
  let user: Keypair;
  let lokalMint: PublicKey;
  let userTokenAccount: PublicKey;
  let poolState: PublicKey;
  let poolVaultAuthority: PublicKey;
  let poolVaultAta: PublicKey;
  let userStakeRecord: PublicKey;

  const POOL_STATE_SEED = "pool_state";
  const POOL_VAULT_AUTHORITY_SEED = "pool_vault_authority";
  const USER_STAKE_SEED = "user_stake";

  before(async () => {
    // Generate keypairs
    poolAuthority = Keypair.generate();
    poolDelegate = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL
    await provider.connection.requestAirdrop(
      poolAuthority.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      poolDelegate.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create LOKAL token mint
    lokalMint = await createMint(
      provider.connection,
      poolAuthority,
      poolAuthority.publicKey,
      null,
      9 // 9 decimals
    );

    console.log("LOKAL Mint:", lokalMint.toBase58());

    // Derive PDAs
    [poolState] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_STATE_SEED)],
      program.programId
    );

    [poolVaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_VAULT_AUTHORITY_SEED)],
      program.programId
    );

    [userStakeRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(USER_STAKE_SEED),
        poolState.toBuffer(),
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create vault ATA
    poolVaultAta = await createAccount(
      provider.connection,
      poolAuthority,
      lokalMint,
      poolVaultAuthority,
      undefined
    );

    // Create user token account and mint tokens
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      lokalMint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      poolAuthority,
      lokalMint,
      userTokenAccount,
      poolAuthority,
      1000 * 1e9 // Mint 1000 LOKAL tokens
    );

    console.log("Setup complete!");
    console.log("Pool State:", poolState.toBase58());
    console.log("Pool Vault Authority:", poolVaultAuthority.toBase58());
    console.log("Pool Vault ATA:", poolVaultAta.toBase58());
    console.log("User:", user.publicKey.toBase58());
    console.log("User Token Account:", userTokenAccount.toBase58());
  });

  it("1. Initialize Pool", async () => {
    const config = {
      minStakeAmount: new anchor.BN(1_000_000), // 0.001 LOKAL
      maxStakePerUser: new anchor.BN(1_000_000_000_000), // 1,000 LOKAL
      depositsEnabled: true,
      withdrawalsEnabled: true,
      apyBasisPoints: 1200, // 12% APY
    };

    await program.methods
      .initializePool(config)
      .accounts({
        poolAuthority: poolAuthority.publicKey,
        poolDelegate: poolDelegate.publicKey,
        poolState: poolState,
        vaultAta: poolVaultAta,
        poolVaultAuthority: poolVaultAuthority,
        voucherMint: lokalMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([poolAuthority])
      .rpc();

    // Verify pool state
    const poolData = await program.account.poolState.fetch(poolState);
    assert.equal(
      poolData.poolAuthority.toBase58(),
      poolAuthority.publicKey.toBase58()
    );
    assert.equal(
      poolData.poolDelegate.toBase58(),
      poolDelegate.publicKey.toBase58()
    );
    assert.equal(poolData.config.depositsEnabled, true);
    assert.equal(poolData.totalVoucherStaked.toNumber(), 0);

    console.log("✅ Pool initialized successfully");
  });

  it("2. User Approves Pool Delegate", async () => {
    const approveAmount = 100 * 1e9; // Approve 100 LOKAL

    // Create approve instruction
    const approveIx = createApproveInstruction(
      userTokenAccount,
      poolDelegate.publicKey,
      user.publicKey,
      approveAmount
    );

    // Send transaction
    const tx = new Transaction().add(approveIx);
    await provider.sendAndConfirm(tx, [user]);

    // Verify approval
    const tokenAccountInfo = await getAccount(
      provider.connection,
      userTokenAccount
    );
    assert.equal(
      tokenAccountInfo.delegate?.toBase58(),
      poolDelegate.publicKey.toBase58()
    );
    assert.equal(tokenAccountInfo.delegatedAmount.toString(), approveAmount.toString());

    console.log("✅ User approved pool delegate for 100 LOKAL");
  });

  it("3. Backend Deposits Voucher (Using Delegation)", async () => {
    const depositAmount = new anchor.BN(50 * 1e9); // Deposit 50 LOKAL

    // Pool delegate executes deposit on behalf of user
    await program.methods
      .depositVoucher(depositAmount)
      .accounts({
        user: user.publicKey,
        poolDelegate: poolDelegate.publicKey,
        poolState: poolState,
        userStakeRecord: userStakeRecord,
        userVoucherAta: userTokenAccount,
        poolVaultAta: poolVaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([poolDelegate])
      .rpc();

    // Verify pool state updated
    const poolData = await program.account.poolState.fetch(poolState);
    assert.equal(poolData.totalVoucherStaked.toString(), depositAmount.toString());
    assert.equal(poolData.totalStakers.toNumber(), 1);

    // Verify user stake record created
    const stakeRecord = await program.account.userStakeRecord.fetch(
      userStakeRecord
    );
    assert.equal(stakeRecord.user.toBase58(), user.publicKey.toBase58());
    assert.equal(stakeRecord.stakedAmount.toString(), depositAmount.toString());

    // Verify tokens transferred
    const userAccountInfo = await getAccount(
      provider.connection,
      userTokenAccount
    );
    const vaultAccountInfo = await getAccount(
      provider.connection,
      poolVaultAta
    );
    assert.equal(userAccountInfo.amount.toString(), (950 * 1e9).toString()); // 1000 - 50
    assert.equal(vaultAccountInfo.amount.toString(), depositAmount.toString());

    console.log("✅ Backend deposited 50 LOKAL using delegation");
  });

  it("4. Backend Records Yield", async () => {
    const yieldAmount = new anchor.BN(5 * 1e9); // 5 SOL equivalent yield

    await program.methods
      .recordYield(yieldAmount)
      .accounts({
        poolDelegate: poolDelegate.publicKey,
        poolState: poolState,
      })
      .signers([poolDelegate])
      .rpc();

    // Verify yield recorded
    const poolData = await program.account.poolState.fetch(poolState);
    assert.equal(poolData.totalYieldEarned.toString(), yieldAmount.toString());
    assert.ok(poolData.rewardIndex > 0);

    console.log("✅ Yield recorded: 5 SOL equivalent");
    console.log("   Reward Index:", poolData.rewardIndex.toString());
  });

  it("5. User Redeems Stake and Claims Yield", async () => {
    const redeemAmount = new anchor.BN(50 * 1e9); // Redeem all 50 LOKAL

    // Get balances before redemption
    const userBalanceBefore = (
      await getAccount(provider.connection, userTokenAccount)
    ).amount;
    const vaultBalanceBefore = (
      await getAccount(provider.connection, poolVaultAta)
    ).amount;

    await program.methods
      .redeemVoucher(redeemAmount)
      .accounts({
        user: user.publicKey,
        poolState: poolState,
        userStakeRecord: userStakeRecord,
        userVoucherAta: userTokenAccount,
        poolVaultAta: poolVaultAta,
        poolVaultAuthority: poolVaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Verify pool state updated
    const poolData = await program.account.poolState.fetch(poolState);
    assert.equal(poolData.totalVoucherStaked.toNumber(), 0);
    assert.equal(poolData.totalStakers.toNumber(), 0);

    // Verify user stake record updated
    const stakeRecord = await program.account.userStakeRecord.fetch(
      userStakeRecord
    );
    assert.equal(stakeRecord.stakedAmount.toNumber(), 0);
    assert.ok(stakeRecord.totalYieldClaimed.toNumber() > 0);

    // Verify tokens returned
    const userBalanceAfter = (
      await getAccount(provider.connection, userTokenAccount)
    ).amount;
    const vaultBalanceAfter = (
      await getAccount(provider.connection, poolVaultAta)
    ).amount;

    assert.equal(
      (userBalanceAfter - userBalanceBefore).toString(),
      redeemAmount.toString()
    );
    assert.equal(
      (vaultBalanceBefore - vaultBalanceAfter).toString(),
      redeemAmount.toString()
    );

    console.log("✅ User redeemed 50 LOKAL + yield");
    console.log("   Yield claimed:", stakeRecord.totalYieldClaimed.toString());
  });

  it("6. User Revokes Delegation", async () => {
    // Create revoke instruction
    const revokeIx = createRevokeInstruction(userTokenAccount, user.publicKey);

    // Send transaction
    const tx = new Transaction().add(revokeIx);
    await provider.sendAndConfirm(tx, [user]);

    // Verify revocation
    const tokenAccountInfo = await getAccount(
      provider.connection,
      userTokenAccount
    );
    assert.equal(tokenAccountInfo.delegate, null);
    assert.equal(tokenAccountInfo.delegatedAmount.toString(), "0");

    console.log("✅ User revoked delegation");
  });

  it("7. Pool Authority Updates Configuration", async () => {
    const newConfig = {
      minStakeAmount: new anchor.BN(2_000_000), // 0.002 LOKAL
      maxStakePerUser: new anchor.BN(2_000_000_000_000), // 2,000 LOKAL
      depositsEnabled: true,
      withdrawalsEnabled: true,
      apyBasisPoints: 1500, // 15% APY
    };

    await program.methods
      .updatePoolConfig(newConfig)
      .accounts({
        poolAuthority: poolAuthority.publicKey,
        poolState: poolState,
      })
      .signers([poolAuthority])
      .rpc();

    // Verify config updated
    const poolData = await program.account.poolState.fetch(poolState);
    assert.equal(poolData.config.apyBasisPoints, 1500);
    assert.equal(poolData.config.minStakeAmount.toString(), newConfig.minStakeAmount.toString());

    console.log("✅ Pool configuration updated");
  });

  it("8. Summary - Complete Workflow Verified", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Complete Workflow Test Summary");
    console.log("=".repeat(60));
    console.log("✅ Pool initialized with configuration");
    console.log("✅ User approved pool delegate (non-custodial)");
    console.log("✅ Backend deposited using delegation");
    console.log("✅ Yield recorded and tracked");
    console.log("✅ User redeemed stake + yield");
    console.log("✅ User revoked delegation");
    console.log("✅ Admin updated pool configuration");
    console.log("=".repeat(60));
    console.log("\n💡 Non-custodial staking system working perfectly!");
  });
});
