import { Connection, Transaction } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-adapter-base';

export interface ClientTransactionConfig {
  wallet: WalletAdapter;
  connection: Connection;
}

export interface TransactionMetadata {
  transactionType: 'register-merchant' | 'update-merchant' | 'purchase' | 'redemption' | 'transfer';
  [key: string]: string | number | boolean | undefined;
}

/**
 * Client-side transaction handling with on-chain confirmation before DB sync
 */
export class ClientTransactionService {
  private wallet: WalletAdapter;
  private connection: Connection;

  constructor(config: ClientTransactionConfig) {
    this.wallet = config.wallet;
    this.connection = config.connection;
  }

  /**
   * Send transaction and wait for confirmation, then sync to database
   */
  async executeAndSync(
    transaction: Transaction,
    metadata: TransactionMetadata
  ): Promise<{
    success: boolean;
    txSignature?: string;
    dbRecordId?: string;
    error?: string;
  }> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Send transaction using wallet adapter
      const txSignature = await this.wallet.sendTransaction(transaction, this.connection);

      console.log('Transaction sent:', txSignature);

      // Wait for confirmation with timeout
      const confirmation = await this.waitForConfirmation(txSignature, 30000);
      
      if (!confirmation.confirmed) {
        throw new Error(confirmation.error || 'Transaction failed to confirm');
      }

      console.log('Transaction confirmed:', txSignature);

      // Sync to database
      const syncResult = await this.syncToDatabase(txSignature, metadata);
      
      if (!syncResult.success) {
        console.error('Database sync failed:', syncResult.error);
        // Transaction succeeded on-chain but DB sync failed
        // This should be handled by a reconciliation process
        return {
          success: false,
          txSignature,
          error: `Transaction confirmed but sync failed: ${syncResult.error}`
        };
      }

      return {
        success: true,
        txSignature,
        dbRecordId: syncResult.data?.id
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
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(
    signature: string,
    timeoutMs: number
  ): Promise<{
    confirmed: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });

        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          
          if (status.value.err) {
            return {
              confirmed: false,
              error: JSON.stringify(status.value.err)
            };
          }

          return { confirmed: true };
        }

      } catch (error) {
        console.error('Error checking confirmation:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      confirmed: false,
      error: 'Confirmation timeout'
    };
  }

  /**
   * Sync transaction to database after confirmation
   */
  private async syncToDatabase(
    txSignature: string,
    metadata: TransactionMetadata
  ): Promise<{
    success: boolean;
    data?: { id: string; txSignature: string };
    error?: string;
  }> {
    try {
      const response = await fetch('/api/sync/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txSignature,
          transactionType: metadata.transactionType,
          metadata
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}`
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

/**
 * Server-initiated transaction service
 */
export class ServerTransactionService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Register merchant via server
   */
  async registerMerchant(params: {
    name: string;
    category: string;
    cashbackRate: number;
    email?: string;
    phone?: string;
    addressLine1: string;
    city: string;
    walletAddress: string;
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    data?: {
      id: string;
      txSignature: string;
      merchantPDA: string;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/anchor/register-merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}`
        };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Process purchase via server
   */
  async processPurchase(params: {
    customerWallet: string;
    merchantId: string;
    purchaseAmount: number;
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    data?: {
      transactionId: string;
      txSignature: string;
      tokensAwarded: number;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/anchor/process-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}`
        };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Update merchant via server
   */
  async updateMerchant(params: {
    merchantId: string;
    newCashbackRate?: number;
    isActive?: boolean;
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    data?: {
      id: string;
      txSignature: string;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/anchor/update-merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}`
        };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

// Utility function to get appropriate service based on context
export function getTransactionService(
  type: 'client',
  config: ClientTransactionConfig
): ClientTransactionService;
export function getTransactionService(
  type: 'server',
  baseUrl?: string
): ServerTransactionService;
export function getTransactionService(
  type: 'client' | 'server',
  configOrBaseUrl?: ClientTransactionConfig | string
): ClientTransactionService | ServerTransactionService {
  if (type === 'client') {
    return new ClientTransactionService(configOrBaseUrl as ClientTransactionConfig);
  } else {
    return new ServerTransactionService(configOrBaseUrl as string);
  }
}
