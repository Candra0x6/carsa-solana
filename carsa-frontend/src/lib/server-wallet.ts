import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getConnection } from './solana';
import * as crypto from 'crypto';

export interface ServerWalletConfig {
  privateKey?: Uint8Array;
  connection?: Connection;
}

/**
 * Server-side wallet management for API-initiated transactions
 */
export class ServerWallet {
  private keypair: Keypair;
  private connection: Connection;

  constructor(config: ServerWalletConfig = {}) {
    this.connection = config.connection || getConnection();
    
    if (config.privateKey) {
      this.keypair = Keypair.fromSecretKey(config.privateKey);
    } else {
      this.keypair = this.getServerKeypair();
    }
  }

  private getServerKeypair(): Keypair {
    // In production, this should use KMS/HSM or secure key storage
    const privateKeyString = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('SERVER_WALLET_PRIVATE_KEY environment variable not set');
    }
    
    try {
      const privateKeyArray = JSON.parse(privateKeyString);
      return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    } catch {
      throw new Error('Invalid SERVER_WALLET_PRIVATE_KEY format');
    }
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  get secretKey(): Uint8Array {
    return this.keypair.secretKey;
  }

  /**
   * Generate a transaction ID for idempotency
   */
  generateTransactionId(): Uint8Array {
    return crypto.randomBytes(32);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(signature: string, timeoutMs: number = 30000): Promise<{
    confirmed: boolean;
    slot?: number;
    blockTime?: number | null;
    error?: string;
  }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        });

        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          
          if (status.value.err) {
            return {
              confirmed: false,
              error: JSON.stringify(status.value.err)
            };
          }

          const transaction = await this.connection.getTransaction(signature, {
            commitment: 'confirmed'
          });
          
          return {
            confirmed: true,
            slot: transaction?.slot,
            blockTime: transaction?.blockTime
          };
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      confirmed: false,
      error: `Transaction confirmation timeout: ${signature}`
    };
  }
}

// Singleton instance
let serverWalletInstance: ServerWallet | null = null;

export function getServerWallet(config?: ServerWalletConfig): ServerWallet {
  if (!serverWalletInstance) {
    serverWalletInstance = new ServerWallet(config);
  }
  return serverWalletInstance;
}
