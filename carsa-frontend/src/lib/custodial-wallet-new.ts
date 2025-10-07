import { Keypair, Transaction, Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { getDatabaseService } from './database-service';
import { getConnection } from './solana';
import crypto from 'crypto';

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
 * Decrypt private key using server-side encryption key
 */
function decryptPrivateKey(encryptedData: string, password: string): Uint8Array {
  const algorithm = 'aes-256-gcm';
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = combined.slice(0, 64);
  const iv = combined.slice(64, 80);
  const authTag = combined.slice(80, 96);
  const encrypted = combined.slice(96);
  
  // Derive key from password
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  
  // Decrypt
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return new Uint8Array(decrypted);
}

export class CustodialWalletManager implements CustodialWalletService {
  private connection: Connection;
  private encryptionKey: string;
  private keypairCache: Map<string, Keypair> = new Map();

  constructor(connection?: Connection, encryptionKey?: string) {
    this.connection = connection || getConnection();
    this.encryptionKey = encryptionKey || process.env.CUSTODIAL_WALLET_ENCRYPTION_KEY || 'default-dev-key';
  }

  async getWalletKeypair(userId: string): Promise<Keypair> {
    // Check cache first
    const cached = this.keypairCache.get(userId);
    if (cached) {
      return cached;
    }

    // Get user data from database
    const dbService = getDatabaseService();
    const user = await dbService.getUserByEmail('dummy'); // Will be replaced with proper lookup
    
    if (!user || !user.wallet_private_key_hash) {
      throw new Error('User does not have a custodial wallet');
    }

    try {
      // Decrypt the private key
      const privateKeyBytes = decryptPrivateKey(user.wallet_private_key_hash, this.encryptionKey);
      const keypair = Keypair.fromSecretKey(privateKeyBytes);

      // Verify the public key matches
      if (keypair.publicKey.toString() !== user.wallet_address) {
        throw new Error('Wallet keypair verification failed');
      }

      // Cache for future use (be careful with memory in production)
      this.keypairCache.set(userId, keypair);

      return keypair;
    } catch (error) {
      console.error('Failed to decrypt custodial wallet:', error);
      throw new Error('Failed to access custodial wallet');
    }
  }

  async signTransaction(userId: string, transaction: Transaction): Promise<Transaction> {
    const keypair = await this.getWalletKeypair(userId);
    transaction.sign(keypair);
    return transaction;
  }

  async getPublicKey(userId: string): Promise<PublicKey> {
    const keypair = await this.getWalletKeypair(userId);
    return keypair.publicKey;
  }

  async hasCustodialWallet(userId: string): Promise<boolean> {
    const dbService = getDatabaseService();
    const user = await dbService.getUserByEmail('dummy'); // Will be replaced with proper lookup

    return !!(user?.wallet_private_key_hash);
  }

  /**
   * Send a transaction using the custodial wallet
   */
  async sendTransaction(userId: string, transaction: Transaction): Promise<string> {
    const signedTransaction = await this.signTransaction(userId, transaction);
    const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
    return signature;
  }

  /**
   * Clear cached keypairs (for security)
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.keypairCache.delete(userId);
    } else {
      this.keypairCache.clear();
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<number> {
    const publicKey = await this.getPublicKey(userId);
    return this.connection.getBalance(publicKey);
  }

  /**
   * Check if wallet needs funding
   */
  async needsFunding(userId: string, minimumBalance: number = 5000000): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance < minimumBalance; // 0.005 SOL minimum
  }

  /**
   * Fund a custodial wallet from server wallet (for development)
   */
  async fundWallet(userId: string, amount: number = 10000000): Promise<string> {
    // This should only be used in development/testing
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Wallet funding not allowed in production');
    }

    const { getServerWallet } = await import('./server-wallet');
    const serverWallet = getServerWallet();
    const userPublicKey = await this.getPublicKey(userId);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverWallet.publicKey,
        toPubkey: userPublicKey,
        lamports: amount
      })
    );

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = serverWallet.publicKey;

    // Sign with server wallet
    transaction.sign(Keypair.fromSecretKey(serverWallet.secretKey));

    // Send transaction
    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    return signature;
  }
}

// Singleton instance
let custodialWalletManager: CustodialWalletManager | null = null;

export function getCustodialWalletManager(): CustodialWalletManager {
  if (!custodialWalletManager) {
    custodialWalletManager = new CustodialWalletManager();
  }
  return custodialWalletManager;
}

/**
 * Enhanced transaction service that works with both custodial and external wallets
 */
export class UnifiedTransactionService {
  private custodialManager: CustodialWalletManager;
  private connection: Connection;

  constructor() {
    this.custodialManager = getCustodialWalletManager();
    this.connection = getConnection();
  }

  /**
   * Execute transaction with appropriate wallet type
   */
  async executeTransaction(params: {
    userId: string;
    transaction: Transaction;
    isCustodial: boolean;
    externalWallet?: {
      publicKey: PublicKey;
      signTransaction: (tx: Transaction) => Promise<Transaction>;
    };
  }): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      let signedTransaction: Transaction;

      if (params.isCustodial) {
        // Use custodial wallet
        signedTransaction = await this.custodialManager.signTransaction(
          params.userId,
          params.transaction
        );
      } else {
        // Use external wallet
        if (!params.externalWallet) {
          throw new Error('External wallet required for non-custodial transaction');
        }
        signedTransaction = await params.externalWallet.signTransaction(params.transaction);
      }

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      return {
        success: true,
        signature
      };

    } catch (error) {
      console.error('Transaction execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's wallet public key (custodial or external)
   */
  async getUserPublicKey(userId: string, isCustodial: boolean): Promise<PublicKey> {
    if (isCustodial) {
      return this.custodialManager.getPublicKey(userId);
    } else {
      // For external wallets, get from user record
      const dbService = getDatabaseService();
      const user = await dbService.getUserByEmail('dummy'); // Will be replaced with proper lookup

      if (!user) {
        throw new Error('User not found');
      }

      return new PublicKey(user.wallet_address);
    }
  }
}

export function getUnifiedTransactionService(): UnifiedTransactionService {
  return new UnifiedTransactionService();
}
