import { Keypair, Transaction, Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { getDatabaseService } from './database-service';
import { getConnection } from './solana';
import crypto from 'crypto';
import bs58 from 'bs58';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Type definitions
export interface UserWallet {
  userId: string;
  walletAddress: string;
  encryptedPrivateKey?: string;
}

// Initialize Supabase client (add your actual URL and key in env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CustodialWallet {
  publicKey: string;
  privateKey: string;
}

export interface CustodialWalletService {
  /**
   * Get the custodial wallet keypair for a user
   */
  getWalletKeypair(userId: string): Promise<Keypair>;
  
  /**
   * Sign a transaction with the user's custodial wallet
   */
  signTransaction(userId: string, transaction: Transaction): Promise<Transaction>;
  
  /**
   * Get the public key for a user's custodial wallet
   */
  getPublicKey(userId: string): Promise<PublicKey>;
  
  /**
   * Check if user has a custodial wallet
   */
  hasCustodialWallet(userId: string): Promise<boolean>;
}

/**
 * Generate a new custodial wallet keypair
 */
export const generateCustodialWallet = (): CustodialWallet => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey)
  };
};

/**
 * Encrypt private key for secure storage
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(privateKey + password, saltRounds);
};

/**
 * Decrypt private key from storage
 */
export const decryptPrivateKey = async (
  encryptedKey: string, 
  privateKey: string, 
  password: string
): Promise<boolean> => {
  return await bcrypt.compare(privateKey + password, encryptedKey);
};

/**
 * Get custodial wallet for user
 * Retrieves encrypted private key from database
 */
export const getUserCustodialWallet = async (userId: string): Promise<UserWallet | null> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, wallet_address, wallet_private_key_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Error fetching user wallet:', error);
      return null;
    }

    return {
      userId: user.id,
      walletAddress: user.wallet_address,
      encryptedPrivateKey: user.wallet_private_key_hash
    };

  } catch (error) {
    console.error('Database error getting user wallet:', error);
    return null;
  }
};

/**
 * Create Keypair from stored private key
 * Note: This should only be used server-side for transaction signing
 */
export const createKeypairFromPrivateKey = (privateKey: string): Keypair => {
  try {
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Error creating keypair from private key:', error);
    throw new Error('Invalid private key format');
  }
};

/**
 * Get wallet balance (SOL)
 */
export const getWalletBalance = async (walletAddress: string): Promise<number> => {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    
    // Convert lamports to SOL
    return balance / 1e9;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error('Failed to fetch wallet balance');
  }
};

/**
 * Fund custodial wallet with SOL (for development/testing)
 * Only works on devnet/testnet
 */
export const fundCustodialWallet = async (
  walletAddress: string,
  amount: number = 1
): Promise<string> => {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    
    // Check if we're on devnet (only allow airdrops on devnet)
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    if (network !== 'devnet') {
      throw new Error('Airdrop only available on devnet');
    }

    // Request airdrop
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * 1e9 // Convert SOL to lamports
    );

    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    return signature;
  } catch (error) {
    console.error('Error funding custodial wallet:', error);
    throw new Error('Failed to fund wallet');
  }
};

/**
 * Transfer SOL between wallets
 */
export const transferSOL = async (
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<string> => {
  try {
    const connection = getConnection();
    const fromKeypair = createKeypairFromPrivateKey(fromPrivateKey);
    const toPublicKey = new PublicKey(toAddress);

    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amount * 1e9, // Convert SOL to lamports
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    // Sign and send transaction
    transaction.sign(fromKeypair);
    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );

    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    return signature;
  } catch (error) {
    console.error('Error transferring SOL:', error);
    throw new Error('Failed to transfer SOL');
  }
};

/**
 * Validate wallet address format
 */
export const isValidWalletAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};
