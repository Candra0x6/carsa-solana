import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Carsa } from '../../../carsa-contracts/target/types/carsa';
import { 
  getConnection, 
  getMerchantPDA, 
  getTransactionPDA, 
  getTransferPDA, 
  getRedemptionPDA,
  getConfigPDA,
  getMintAuthorityPDA
} from './solana';

// Import the IDL
import CarsaIDL from './carsa.json';

export interface AnchorClientConfig {
  wallet?: Keypair;
  connection?: Connection;
}

export class AnchorClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;

  constructor(config: AnchorClientConfig = {}) {
    this.connection = config.connection || getConnection();
    
    // For server-side, we'll use a keypair wallet
    const wallet = config.wallet || this.getServerWallet();
    
    // Create a wallet adapter for Anchor
    const walletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) {
          tx.sign(wallet);
        }
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        txs.forEach(tx => {
          if (tx instanceof Transaction) {
            tx.sign(wallet);
          }
        });
        return txs;
      }
    };

    this.provider = new AnchorProvider(this.connection, walletAdapter, {
      preflightCommitment: 'confirmed',
      commitment: 'confirmed'
    });

    // Initialize the program with actual IDL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(CarsaIDL as any, this.provider);
  }

  private getServerWallet(): Keypair {
    // In production, this should use KMS/HSM or secure key storage
    // For development, load from environment variable
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

  /**
   * Initialize the Lokal token mint (one-time setup)
   */
  async initializeLokalMint(): Promise<string> {
    const [configPDA] = getConfigPDA();
    const [mintAuthorityPDA] = getMintAuthorityPDA();
    
    const tx = await this.program.methods
      .initializeLokalMint()
      .accounts({
        config: configPDA,
        mintAuthority: mintAuthorityPDA,
        payer: this.provider.wallet.publicKey,
        systemProgram: PublicKey.default,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Register a new merchant on-chain (server-initiated)
   * Note: This creates a merchant account where the server acts as the merchant owner
   * In production, you might want to transfer ownership to the actual merchant later
   */
  async registerMerchant(params: {
    merchantWallet: PublicKey;
    name: string;
    category: string;
    cashbackRate: number;
  }): Promise<string> {
    // Use server wallet as the merchant owner for server-initiated registration
    const [merchantPDA] = getMerchantPDA(params.merchantWallet);

    const tx = await this.program.methods
      .registerMerchant(params.name, params.category, params.cashbackRate)
      .accounts({
        merchantOwner: params.merchantWallet,
        merchantAccount: merchantPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Update merchant settings on-chain
   */
  async updateMerchant(params: {
    merchantWallet: PublicKey;
    newCashbackRate?: number;
    isActive?: boolean;
  }): Promise<string> {
    const [merchantPDA] = getMerchantPDA(params.merchantWallet);
    
    const tx = await this.program.methods
      .updateMerchant(
        params.newCashbackRate !== undefined ? params.newCashbackRate : null,
        params.isActive !== undefined ? params.isActive : null
      )
      .accounts({
        merchantOwner: params.merchantWallet,
        merchantAccount: merchantPDA,
      })
      .rpc();

    return tx;
  }

  /**
   * Process a purchase and distribute rewards
   */
  async processPurchase(params: {
    customerWallet: PublicKey;
    merchantWallet: PublicKey;
    purchaseAmount: BN;
    transactionId: Uint8Array;
  }): Promise<string> {
    const [merchantPDA] = getMerchantPDA(params.merchantWallet);
    const [transactionPDA] = getTransactionPDA(params.transactionId);
    const [mintAuthorityPDA] = getMintAuthorityPDA();
    const [configPDA] = getConfigPDA();
    
    // Get token accounts
    const customerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS!),
      params.customerWallet
    );

    // Check if customer token account exists, create if necessary
    const customerTokenAccountInfo = await this.connection.getAccountInfo(customerTokenAccount);
    const preInstructions = [];
    
    if (!customerTokenAccountInfo) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey, // payer
          customerTokenAccount,
          params.customerWallet, // owner
          new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS!)
        )
      );
    }

    const tx = await this.program.methods
      .processPurchase(params.purchaseAmount, Array.from(params.transactionId))
      .accounts({
        serverWallet: this.provider.wallet.publicKey,
        customer: params.customerWallet,
        merchantOwner: params.merchantWallet,
        merchantAccount: merchantPDA,
        transactionAccount: transactionPDA,
        customerTokenAccount,
        mint: new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS!),
        mintAuthority: mintAuthorityPDA,
        config: configPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(preInstructions)
      .rpc();

    return tx;
  }

  /**
   * Transfer tokens between users
   */
  async transferTokens(params: {
    fromWallet: PublicKey;
    toWallet: PublicKey;
    amount: BN;
    transactionId: Uint8Array;
    memo: string;
  }): Promise<string> {
    const [transferPDA] = getTransferPDA(params.fromWallet, params.transactionId);
    
    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LOKAL_TOKEN_MINT!),
      params.fromWallet
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LOKAL_TOKEN_MINT!),
      params.toWallet
    );

    const tx = await this.program.methods
      .transferTokens(params.amount, Array.from(params.transactionId), params.memo)
      .accounts({
        from: params.fromWallet,
        to: params.toWallet,
        fromTokenAccount,
        toTokenAccount,
        transferRecord: transferPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: PublicKey.default,
      })
      .rpc();

    return tx;
  }

  /**
   * Redeem tokens at a merchant
   */
  async redeemTokens(params: {
    customerWallet: PublicKey;
    merchantWallet: PublicKey;
    tokenAmount: BN;
    fiatValue: BN;
    discountRate: number;
    transactionId: Uint8Array;
  }): Promise<string> {
    const [merchantPDA] = getMerchantPDA(params.merchantWallet);
    const [redemptionPDA] = getRedemptionPDA(
      params.customerWallet,
      merchantPDA,
      params.transactionId
    );
    
    // Get token accounts
    const customerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LOKAL_TOKEN_MINT!),
      params.customerWallet
    );
    
    const merchantTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LOKAL_TOKEN_MINT!),
      params.merchantWallet
    );

    const tx = await this.program.methods
      .redeemTokens(
        params.tokenAmount,
        params.fiatValue,
        params.discountRate,
        Array.from(params.transactionId)
      )
      .accounts({
        customer: params.customerWallet,
        merchant: merchantPDA,
        merchantWallet: params.merchantWallet,
        redemption: redemptionPDA,
        customerTokenAccount,
        merchantTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: PublicKey.default,
      })
      .rpc();

    return tx;
  }

  /**
   * Get transaction confirmation status
   */
  async confirmTransaction(signature: string): Promise<{
    confirmed: boolean;
    slot?: number;
    blockTime?: number | null;
    err?: unknown;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (status.value?.confirmationStatus === 'confirmed' || 
          status.value?.confirmationStatus === 'finalized') {
        
        const transaction = await this.connection.getTransaction(signature, {
          commitment: 'confirmed'
        });
        
        return {
          confirmed: true,
          slot: transaction?.slot,
          blockTime: transaction?.blockTime,
          err: status.value.err
        };
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return { confirmed: false };
    }
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForConfirmation(
    signature: string,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.confirmTransaction(signature);
      if (result.confirmed && !result.err) {
        return true;
      }
      
      if (result.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(result.err)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Transaction confirmation timeout: ${signature}`);
  }

  /**
   * Get program account data
   */
  async getAccountData<T = unknown>(address: PublicKey, accountType: string): Promise<T | null> {
    try {
      // Type assertion needed for dynamic account access with generic IDL
      const accountNamespace = this.program.account as Record<string, { fetch: (address: PublicKey) => Promise<unknown> }>;
      const account = await accountNamespace[accountType].fetch(address);
      return account as T;
    } catch (error) {
      console.error(`Error fetching ${accountType} account:`, error);
      return null;
    }
  }

  /**
   * Get merchant account data
   */
  async getMerchantData(merchantWallet: PublicKey) {
    const [merchantPDA] = getMerchantPDA(merchantWallet);
    return this.getAccountData(merchantPDA, 'merchant');
  }
}

// Singleton instance for server-side usage
let anchorClientInstance: AnchorClient | null = null;

export function getAnchorClient(config?: AnchorClientConfig): AnchorClient {
  if (!anchorClientInstance) {
    anchorClientInstance = new AnchorClient(config);
  }
  return anchorClientInstance;
}
