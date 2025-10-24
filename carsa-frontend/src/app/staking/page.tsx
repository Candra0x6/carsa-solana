"use client"
/**
 * Frontend Integration Example - Non-Custodial Voucher Staking
 * 
 * This file demonstrates how to integrate the voucher pool staking system
 * into a React/Next.js frontend using Solana wallet adapters.
 */
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createApproveInstruction,
  createRevokeInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import { useState, useEffect, useCallback } from 'react';
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';

// ============================================================================
// Configuration
// ============================================================================

const PROGRAM_ID = new PublicKey("FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY");
const LOKAL_MINT = new PublicKey("5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9");
const POOL_DELEGATE = new PublicKey("Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR");

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Read a u64 (8-byte unsigned integer) from a buffer in little-endian format
 * Browser-compatible version that doesn't rely on Node.js Buffer methods
 */
function readU64LE(buffer: Uint8Array, offset: number = 0): bigint {
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value += BigInt(buffer[offset + i]) << BigInt(8 * i);
  }
  return value;
}

// ============================================================================
// React Component: Voucher Staking Widget
// ============================================================================

export function VoucherStakingWidget() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [voucherBalance, setVoucherBalance] = useState<number>(0);
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [delegateAllowance, setDelegateAllowance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Fetch Staked Amount
  // ============================================================================

  const fetchStakedAmount = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      // Get PDAs
      const poolState = getPoolStatePDA(PROGRAM_ID);
      const userStakePDA = getUserStakePDA(PROGRAM_ID, poolState, publicKey);

      // Fetch the account data directly
      const accountInfo = await connection.getAccountInfo(userStakePDA);

      console.log("User Stake PDA:", userStakePDA.toBase58());

      if (!accountInfo) {
        console.log("No stake record found - user has not staked yet");
        setStakedAmount(0);
        return;
      }

      console.log("Account data length:", accountInfo.data.length, "bytes");

      // Parse the account data (UserStakeRecord struct)
      // Layout: discriminator(8) + user(32) + pool(32) + staked_amount(8) + user_reward_index(16) + 
      //         total_yield_claimed(8) + staked_at(8) + last_action_at(8) + bump(1) + reserved(32)
      const data = accountInfo.data;

      // Skip discriminator (8 bytes) + user pubkey (32 bytes) + pool pubkey (32 bytes) = 72 bytes
      // Read staked_amount (next 8 bytes as u64 little-endian)
      const stakedAmountBN = readU64LE(data, 72);
      const stakedAmountValue = Number(stakedAmountBN) / 1e9;

      console.log("Staked Amount (raw):", stakedAmountBN.toString());
      console.log("Staked Amount:", stakedAmountValue, "LOKAL");
      setStakedAmount(stakedAmountValue);
    } catch (error) {
      console.log("Error fetching stake:", error);
      setStakedAmount(0);
    }
  }, [publicKey, connection]);

  // ============================================================================
  // Fetch User Data
  // ============================================================================

  const fetchUserData = useCallback(async () => {
    if (!publicKey) return;

    try {
      // Get user's voucher ATA
      const userAta = await getAssociatedTokenAddress(LOKAL_MINT, publicKey);
      const accountInfo = await getAccount(connection, userAta);

      // Set balance
      setVoucherBalance(Number(accountInfo.amount) / 1e9);

      // Check delegate allowance
      if (accountInfo.delegate && accountInfo.delegate.equals(POOL_DELEGATE)) {
        setDelegateAllowance(Number(accountInfo.delegatedAmount) / 1e9);
      } else {
        setDelegateAllowance(0);
      }

      // Fetch staked amount from pool
      await fetchStakedAmount();
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch account data");
    }
  }, [publicKey, connection, fetchStakedAmount]);

  useEffect(() => {
    fetchUserData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchUserData, 10000);
    return () => clearInterval(interval);
  }, [fetchUserData]);

  // ============================================================================
  // Approve Delegation
  // ============================================================================

  const handleApproveDelegate = async () => {
    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    if (approvalAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userAta = await getAssociatedTokenAddress(LOKAL_MINT, publicKey);

      // Convert amount to token units (9 decimals)
      const amountInTokenUnits = BigInt(Math.floor(approvalAmount * 1e9));

      // Create approve instruction
      const approveIx = createApproveInstruction(
        userAta,
        POOL_DELEGATE,
        publicKey,
        amountInTokenUnits
      );

      // Create and send transaction
      const transaction = new Transaction().add(approveIx);
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setDelegateAllowance(approvalAmount);
      setApprovalAmount(0);

      // Automatically trigger deposit via API
      try {
        const response = await fetch('/api/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPubkey: publicKey.toBase58() })
        });

        const result = await response.json();

        if (result.success) {
          console.log("✅ Auto-deposit successful:", result.signature);

          // Immediately refresh data multiple times to catch the update
          setTimeout(() => fetchUserData(), 1000);
          setTimeout(() => fetchUserData(), 3000);
          setTimeout(() => fetchUserData(), 5000);

          toast.success(`Success! Your tokens have been automatically staked`);
        } else {
          console.error("Deposit API error:", result.error);
          toast.error(`Approval successful but auto-deposit failed ${result.error}`);
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);
        toast.error(`Approval successful! Your tokens will be staked by the backend service.`);

        // Still try to refresh in case it worked
        setTimeout(() => fetchUserData(), 3000);
      }
    } catch (error) {
      console.error("Error approving delegate:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to approve delegate";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Revoke Delegation
  // ============================================================================

  const handleRevokeDelegate = async () => {
    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    if (delegateAllowance <= 0) {
      setError("No active approval to revoke");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userAta = await getAssociatedTokenAddress(LOKAL_MINT, publicKey);

      // Create revoke instruction
      const revokeIx = createRevokeInstruction(
        userAta,
        publicKey
      );

      // Create and send transaction
      const transaction = new Transaction().add(revokeIx);
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log("✅ Revocation successful:", signature);
      setDelegateAllowance(0);

      toast.success(`Success! Delegate approval has been revoked.`);
    } catch (error) {
      console.error("Error revoking delegate:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to revoke delegate";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Redeem Stake (Manual Withdrawal)
  // ============================================================================

  const handleRedeemStake = async () => {
    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    if (stakedAmount <= 0) {
      setError("No tokens staked");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🔓 Starting redemption process...");

      // Setup wallet adapter for Anchor
      const wallet = {
        publicKey: publicKey,
        signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
          return await sendTransaction(tx, connection) as unknown as T;
        },
        signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
          return txs;
        },
      };

      const provider = new AnchorProvider(
        connection,
        wallet as anchor.Wallet,
        { commitment: "confirmed" }
      );

      // Load program IDL
      const idlResponse = await fetch('/carsa-idl.json');
      const idl = await idlResponse.json();
      const program = new Program(idl, provider);

      console.log("Program ID:", program.programId.toBase58());

      // Get PDAs and accounts
      const poolState = getPoolStatePDA(PROGRAM_ID);
      const poolVaultAuthority = getPoolVaultAuthorityPDA(PROGRAM_ID);
      const userStakePDA = getUserStakePDA(PROGRAM_ID, poolState, publicKey);

      const userAta = await getAssociatedTokenAddress(LOKAL_MINT, publicKey);
      const poolVaultAta = await getAssociatedTokenAddress(
        LOKAL_MINT,
        poolVaultAuthority,
        true
      );

      console.log("User Stake PDA:", userStakePDA.toBase58());
      console.log("User ATA:", userAta.toBase58());
      console.log("Pool Vault:", poolVaultAta.toBase58());

      // Get current staked amount to redeem all
      const stakeAccountInfo = await connection.getAccountInfo(userStakePDA);
      if (!stakeAccountInfo) {
        throw new Error("Stake account not found");
      }

      const stakedAmountBN = readU64LE(stakeAccountInfo.data, 72);
      console.log("Redeeming amount:", stakedAmountBN.toString(), "lamports");

      // Build and send redeem transaction
      console.log("🚀 Building redemption transaction...");

      const tx = await program.methods
        .redeemVoucher(new anchor.BN(stakedAmountBN.toString()))
        .accounts({
          user: publicKey,
          userVoucherAta: userAta,
          poolVaultAta: poolVaultAta,
        })
        .transaction();

      // Send transaction
      const signature = await sendTransaction(tx, connection);
      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log("✅ Redemption successful!");

      // Refresh balances
      setTimeout(() => fetchUserData(), 1000);
      setTimeout(() => fetchUserData(), 3000);

      toast.success(`Success! Your tokens have been redeemed!`);

    } catch (error) {
      console.error("Error redeeming stake:", error);
      let errorMessage = "Failed to redeem stake";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check for specific error patterns
      if (error && typeof error === 'object' && 'logs' in error) {
        console.error("Program logs:", error.logs);
      }

      setError(errorMessage);
      toast.error(`Redemption failed! Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render UI
  // ============================================================================

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto space-y-8 p-6 pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              CARSA Staking Platform
            </h1>
            <p className="text-white/70">
              Stake your LOKAL tokens and earn rewards
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">🪙 Stake Your LOKAL Tokens</h2>
              <p className="text-green-400 text-sm mt-1">Earn yield on your LOKAL tokens</p>
            </div>
            <div className="p-6">
              <p className="text-white/70">Please connect your wallet to start staking.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto space-y-8 p-6 pt-20">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            CARSA <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Staking</span>
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
  Stake your LOKAL tokens to earn yield and rewards.
          </p>
        </div>

        <Card variant="surface" className='p-6'>
          <div className="p-2 mb-2 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">🪙 Stake Your LOKAL Tokens</h2>
            <p className="text-green-400 text-sm mt-1">Enable auto-staking and earn 12% APY</p>
          </div>
          <div className="p-2 mt-2">

            {/* Account Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-black/30 rounded-2xl border border-white/10">
              <div>
                <p className="text-sm text-white/60">Available Balance</p>
                <p className="text-lg font-semibold text-white">{voucherBalance.toFixed(4)} LOKAL</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Staked Amount</p>
                <p className="text-lg font-semibold text-green-400">{stakedAmount.toFixed(4)} LOKAL</p>
              </div>
            </div>

            {/* Approval Status */}
            {delegateAllowance > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-300">✓ Auto-Staking Enabled</p>
                    <p className="text-xs text-blue-400/80">
                      Approved: {delegateAllowance.toFixed(4)} LOKAL
                    </p>
                  </div>
                  <button
                    onClick={handleRevokeDelegate}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-red-500/80 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors backdrop-blur-sm"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}

            {/* Approve Delegation Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Enable Auto-Staking</h3>
              <p className="text-sm text-white/70 mb-4">
                Approve the staking pool to automatically stake your LOKAL tokens.
                You can revoke this at any time.
              </p>

              <div className="flex gap-3">
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Amount to approve"
                  step="0.0001"
                  min="0"
                  max={voucherBalance}
                  className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#7c5aff] focus:border-transparent"
                />
                <button
                  onClick={() => setApprovalAmount(voucherBalance)}
                  className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Max
                </button>
                <button
                  onClick={handleApproveDelegate}
                  disabled={loading || approvalAmount <= 0}
                  className="px-6 py-2 bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] text-white rounded-xl hover:from-[#8f71ff] hover:to-[#7c5aff] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#7c5aff]/20"
                >
                  {loading ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>

            {/* Manual Redemption Section */}
            {stakedAmount > 0 && (
              <Card variant={"surface"} className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Unstake & Claim Rewards</h3>
                <p className="text-sm text-white/70 mb-4">
                  Withdraw your staked tokens. You can redeem all or keep staking to earn more yield.
                </p>

                <div className="mb-4 p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/70">Available to Redeem:</span>
                    <span className="font-semibold text-green-400">{stakedAmount.toFixed(4)} LOKAL</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Current APY:</span>
                    <span>12%</span>
                  </div>
                </div>

                <button
                  onClick={handleRedeemStake}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg shadow-green-500/20"
                >
                  {loading ? "Processing Redemption..." : "🔓 Redeem All Staked Tokens"}
                </button>

                <p className="mt-3 text-xs text-white/60">
                  Note: Redeeming will unstake all your tokens and transfer them back to your wallet.
                </p>
              </Card>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl text-red-300 text-sm mb-4 backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Information Box */}
            <Card variant={"surface"} className='p-4 mt-6'>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center text-xs">
                  ℹ️
                </div>
                How it works:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-white/70">
                <li>Earn LOKAL tokens from merchant purchases</li>
                <li>Approve auto-staking with a single transaction</li>
                <li>Backend automatically stakes your approved tokens</li>
                <li>Earn yield on your staked tokens (12% APY)</li>
                <li>Revoke approval or redeem anytime - you stay in control!</li>
              </ol>
            </Card>

            {/* Security Notice */}
            <div className="mt-4 p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-2xl text-xs text-yellow-300/90 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  🔒
                </div>
                <div>
                  <strong className="text-yellow-300">Security:</strong> This is a non-custodial system. Your tokens remain
                  in your wallet until automatically transferred to the staking pool. You can revoke
                  approval at any time.
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default VoucherStakingWidget;
