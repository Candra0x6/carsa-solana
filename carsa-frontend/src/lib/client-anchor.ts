import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { 
  getConnection, 
  getMerchantPDA,
  getConfigPDA,
  getMintAuthorityPDA,
  getTransactionRecordPDA
} from './solana';

// Import the IDL
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

    // Initialize the program with actual IDL
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
   * Process a purchase transaction and distribute reward tokens
   * The connected wallet will be the customer receiving tokens
   */
  async processPurchase(params: {
    merchantWalletAddress: string;
    purchaseAmount: number;
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

    // Get or create customer's associated token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      customer
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

    // Create the process purchase instruction
    const processPurchaseInstruction = await this.program.methods
      .processPurchase(
        new anchor.BN(params.purchaseAmount),
        Array.from(params.transactionId)
      )
      .accounts({
        customer: customer,
        merchantAccount: merchantPDA,
        mint: mintAddress,
        mintAuthority: mintAuthorityPDA,
        config: configPDA,
        customerTokenAccount: customerTokenAccount,
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

  // Get customer's associated token account
  const customerTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    customer
  );

  return await client['program'].methods
    .processPurchase(
      new anchor.BN(params.purchaseAmount),
      Array.from(params.transactionId)
    )
    .accounts({
      customer: customer,
      merchantAccount: merchantPDA,
      mint: mintAddress,
      mintAuthority: mintAuthorityPDA,
      config: configPDA,
      customerTokenAccount: customerTokenAccount,
      transactionRecord: transactionRecordPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}
