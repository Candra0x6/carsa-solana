import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { 
  getConnection, 
  getMerchantPDA,
  getConfigPDA,
  getMintAuthorityPDA,
  getTransactionRecordPDA
} from './solana';

// Import the IDL from the contract
import CarsaIDL from './carsa.json';

export interface ClientAnchorConfig {
  wallet: anchor.Wallet;
  connection?: Connection;
}

/**
 * Client-side Anchor client for wallet-connected transactions
 */
export class ClientAnchorClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;

  constructor(config: ClientAnchorConfig) {
    this.connection = config.connection || getConnection();
    
    this.provider = new AnchorProvider(this.connection, config.wallet, {
      preflightCommitment: 'confirmed',
      commitment: 'confirmed'
    });

    // Initialize the program with IDL (temporary without strict typing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(CarsaIDL as any, this.provider);
  }

  /**
   * Register a new merchant on-chain (client-initiated)
   * The connected wallet will be the merchant owner
   */
  async registerMerchant(params: {
    name: string;
    category: string;
    cashbackRate: number;
  }): Promise<string> {
    const merchantOwner = this.provider.wallet.publicKey;
    const [merchantPDA] = getMerchantPDA(merchantOwner);
    
    // Check if merchant already exists
    const exists = await this.merchantExists();
    if (exists) {
      throw new Error('A merchant account already exists for this wallet. Each wallet can only register one merchant.');
    }
    
    const tx = await this.program.methods
      .registerMerchant(params.name, params.category, params.cashbackRate)
      .accounts({
        merchantOwner: merchantOwner,
        merchantAccount: merchantPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Get the merchant PDA for the connected wallet
   */
  getMerchantPDA(): [PublicKey, number] {
    return getMerchantPDA(this.provider.wallet.publicKey);
  }

  /**
   * Check if a merchant account exists for the connected wallet
   */
  async merchantExists(): Promise<boolean> {
    try {
      const [merchantPDA] = this.getMerchantPDA();
      const accountInfo = await this.connection.getAccountInfo(merchantPDA);
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get merchant account data for the connected wallet
   */
  async getMerchantAccount() {
    const [merchantPDA] = this.getMerchantPDA();
    const accountInfo = await this.connection.getAccountInfo(merchantPDA);
    return accountInfo;
  }

  /**
   * Get parsed merchant account data from the smart contract
   */
  async getMerchantData() {
    try {
      const [merchantPDA] = this.getMerchantPDA();
      // First check if account exists
      const accountInfo = await this.connection.getAccountInfo(merchantPDA);
      if (!accountInfo) {
        return null;
      }

      // Try to deserialize the account data
      // Since we can't use program.account.merchantAccount.fetch() due to IDL issues,
      // we'll parse the raw account data
      // const accountData = accountInfo.data; // Future use for parsing
      
      // Basic parsing - this would need to match your Rust struct layout
      // For now, return the raw account info with PDA
      return {
        publicKey: merchantPDA,
        accountInfo: accountInfo,
        // Add more parsed fields here when you have the proper deserialization
      };
    } catch (error) {
      console.error('Error fetching merchant data:', error);
      return null;
    }
  }

  /**
   * Get merchant account for any wallet address (not just connected wallet)
   */
  async getMerchantDataByWallet(walletAddress: PublicKey) {
    try {
      const [merchantPDA] = getMerchantPDA(walletAddress);
      const accountInfo = await this.connection.getAccountInfo(merchantPDA);
      
      if (!accountInfo) {
        return null;
      }

      return {
        publicKey: merchantPDA,
        accountInfo: accountInfo,
        walletAddress: walletAddress,
      };
    } catch (error) {
      console.error('Error fetching merchant data by wallet:', error);
      return null;
    }
  }

  /**
   * Get the connected wallet's LOKAL token balance
   * Returns the balance in the smallest token unit (considering decimals)
   */
  async getLokalTokenBalance(): Promise<{ balance: number; exists: boolean; decimals: number }> {
    try {
      const walletAddress = this.provider.wallet.publicKey;
      
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Get the LOKAL mint address from environment or config
      const mintAddress = new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS || 'REPLACE_WITH_ACTUAL_MINT');
      
      // Get the associated token account address for the connected wallet
      const tokenAccountAddress = await getAssociatedTokenAddress(
        mintAddress,
        walletAddress
      );

      // Check if the token account exists
      const accountInfo = await this.connection.getAccountInfo(tokenAccountAddress);
      
      if (!accountInfo) {
        // Token account doesn't exist, so balance is 0
        return {
          balance: 0,
          exists: false,
          decimals: 9, // Default decimals for LOKAL token
        };
      }

      try {
        // Get the token account data
        const tokenAccount = await getAccount(this.connection, tokenAccountAddress);
        
        return {
          balance: Number(tokenAccount.amount),
          exists: true,
          decimals: 9, // LOKAL token decimals - you might want to get this from mint info
        };
      } catch (accountError) {
        console.error('Error parsing token account:', accountError);
        return {
          balance: 0,
          exists: false,
          decimals: 9,
        };
      }
      
    } catch (error) {
      console.error('Error fetching LOKAL token balance:', error);
      throw new Error(`Failed to fetch LOKAL token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the connected wallet's LOKAL token balance formatted for display
   * Returns the balance as a human-readable number (accounting for decimals)
   */
  async getFormattedLokalBalance(): Promise<{ balance: string; balanceNumber: number; exists: boolean }> {
    try {
      const balanceInfo = await this.getLokalTokenBalance();
      const balanceNumber = balanceInfo.balance / Math.pow(10, balanceInfo.decimals);
      
      return {
        balance: balanceNumber.toFixed(2), // Format to 2 decimal places for display
        balanceNumber: balanceNumber,
        exists: balanceInfo.exists,
      };
    } catch (error) {
      console.error('Error fetching formatted LOKAL balance:', error);
      throw error;
    }
  }

  /**
   * Process a purchase transaction and distribute reward tokens
   * The connected wallet will be the customer receiving tokens
   */
  async processPurchase(params: {
    merchantWalletAddress: string;
    purchaseAmount: number;
    redeemTokenAmount?: number;
    transactionId: Uint8Array;
  }): Promise<string> {
    const customer = this.provider.wallet.publicKey;
    
    if (!customer) {
      throw new Error('Wallet not connected');
    }

    // Get all required PDAs and accounts
    const merchantWallet = new PublicKey(params.merchantWalletAddress);
    const [merchantPDA] = getMerchantPDA(merchantWallet);
    const [configPDA] = getConfigPDA();
    const [mintAuthorityPDA] = getMintAuthorityPDA();
    const [transactionRecordPDA] = getTransactionRecordPDA(customer, params.transactionId);

    // Get config account to determine mint address
    const configAccount = await this.connection.getAccountInfo(configPDA);
    if (!configAccount) {
      throw new Error('Config account not found. Please ensure the program is initialized.');
    }

    // For now, we'll use a hardcoded mint address - in production you'd parse the config account
    // TODO: Parse config account to get actual mint address
    const mintAddress = new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS || 'REPLACE_WITH_ACTUAL_MINT');

    // Get customer's associated token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      customer
    );

    // Get merchant's associated token account (required by the contract)
    const merchantTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      merchantWallet
    );

    // Check if customer token account exists
    const customerTokenAccountInfo = await this.connection.getAccountInfo(customerTokenAccount);
    
    // Build transaction instructions
    const instructions = [];

    // If customer token account doesn't exist, create it
    if (!customerTokenAccountInfo) {
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        customer, // payer
        customerTokenAccount, // ata
        customer, // owner
        mintAddress // mint
      );
      instructions.push(createATAInstruction);
    }

    // Create the process purchase instruction with proper parameters
    // Note: Using snake_case names that match the IDL exactly
    const processPurchaseInstruction = await this.program.methods
      .processPurchase(
        new anchor.BN(params.purchaseAmount),
        params.redeemTokenAmount ? new anchor.BN(params.redeemTokenAmount) : null,
        Array.from(params.transactionId)
      )
      .accounts({
        customer: customer,
        merchantAccount: merchantPDA,
        mint: mintAddress,
        mintAuthority: mintAuthorityPDA,
        config: configPDA,
        customerTokenAccount: customerTokenAccount,
        merchantTokenAccount: merchantTokenAccount,
        transactionRecord: transactionRecordPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    instructions.push(processPurchaseInstruction);

    // Create and send transaction
    const transaction = new anchor.web3.Transaction();
    transaction.add(...instructions);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = customer;

    // Sign and send transaction
    const signature = await this.provider.sendAndConfirm(transaction);
    
    return signature;
  }

  /**
   * Process a purchase transaction with token redemption
   * This method allows customers to use LOKAL tokens as payment while still earning rewards
   */
  async processPurchaseWithRedemption(params: {
    merchantWalletAddress: string;
    fiatAmount: number;
    redeemTokenAmount: number;
    transactionId: Uint8Array;
  }): Promise<string> {
    return this.processPurchase({
      merchantWalletAddress: params.merchantWalletAddress,
      purchaseAmount: params.fiatAmount,
      redeemTokenAmount: params.redeemTokenAmount,
      transactionId: params.transactionId,
    });
  }

  /**
   * Update merchant settings (cashback rate, active status)
   * Only the merchant owner can update their settings
   */
  async updateMerchant(params: {
    newCashbackRate?: number;
    isActive?: boolean;
  }): Promise<string> {
    const merchantOwner = this.provider.wallet.publicKey;
    const [merchantPDA] = getMerchantPDA(merchantOwner);
    
    // Check if merchant account exists
    const exists = await this.merchantExists();
    if (!exists) {
      throw new Error('No merchant account found for this wallet. Please register as a merchant first.');
    }
    
    const tx = await this.program.methods
      .updateMerchant(
        params.newCashbackRate ? params.newCashbackRate : null,
        params.isActive !== undefined ? params.isActive : null
      )
      .accounts({
        merchantOwner: merchantOwner,
        merchantAccount: merchantPDA,
      })
      .rpc();

    return tx;
  }
}

/**
 * Utility function to create a register merchant instruction without executing it
 * Useful for building transactions that need additional signatures
 */
export async function createRegisterMerchantInstruction(
  config: ClientAnchorConfig,
  params: {
    name: string;
    category: string;
    cashbackRate: number;
  }
) {
  const client = new ClientAnchorClient(config);
  const merchantOwner = config.wallet.publicKey;
  const [merchantPDA] = getMerchantPDA(merchantOwner);
  
  return await client['program'].methods
    .registerMerchant(params.name, params.category, params.cashbackRate)
    .accounts({
      merchantOwner: merchantOwner,
      merchantAccount: merchantPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Utility function to create a process purchase instruction without executing it
 * Useful for building transactions that need additional signatures
 */
export async function createProcessPurchaseInstruction(
  config: ClientAnchorConfig,
  params: {
    merchantWalletAddress: string;
    purchaseAmount: number;
    redeemTokenAmount?: number;
    transactionId: Uint8Array;
  }
) {
  const client = new ClientAnchorClient(config);
  const customer = config.wallet.publicKey;
  
  if (!customer) {
    throw new Error('Wallet not connected');
  }

  // Get all required PDAs and accounts
  const merchantWallet = new PublicKey(params.merchantWalletAddress);
  const [merchantPDA] = getMerchantPDA(merchantWallet);
  const [configPDA] = getConfigPDA();
  const [mintAuthorityPDA] = getMintAuthorityPDA();
  const [transactionRecordPDA] = getTransactionRecordPDA(customer, params.transactionId);

  // Get mint address (hardcoded for now - should be retrieved from config in production)
  const mintAddress = new PublicKey(process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS || 'REPLACE_WITH_ACTUAL_MINT');

  // Get customer's and merchant's associated token accounts
  const customerTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    customer
  );

  const merchantTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    merchantWallet
  );

  return await client['program'].methods
    .processPurchase(
      new anchor.BN(params.purchaseAmount),
      params.redeemTokenAmount ? new anchor.BN(params.redeemTokenAmount) : null,
      Array.from(params.transactionId)
    )
    .accounts({
      customer: customer,
      merchantAccount: merchantPDA,
      mint: mintAddress,
      mintAuthority: mintAuthorityPDA,
      config: configPDA,
      customerTokenAccount: customerTokenAccount,
      merchantTokenAccount: merchantTokenAccount,
      transactionRecord: transactionRecordPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Process a purchase transaction with optional token redemption
 * This creates an instruction for the unified processPurchase method that handles both
 * reward distribution and token redemption in a single transaction
 */
export async function createProcessPurchaseWithRedemptionInstruction(
  config: ClientAnchorConfig,
  params: {
    merchantWalletAddress: string;
    fiatAmount: number;
    redeemTokenAmount?: number;
    transactionId: Uint8Array;
  }
) {
  return createProcessPurchaseInstruction(config, {
    merchantWalletAddress: params.merchantWalletAddress,
    purchaseAmount: params.fiatAmount,
    redeemTokenAmount: params.redeemTokenAmount,
    transactionId: params.transactionId,
  });
}
