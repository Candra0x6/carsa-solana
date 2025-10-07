import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';

// Network configuration
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'https://api.devnet.solana.com';
export const COMMITMENT: Commitment = 'confirmed';

// Connection instances
let connection: Connection | null = null;

/**
 * Get or create a connection to the Solana network
 */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_NETWORK, COMMITMENT);
  }
  return connection;
}

/**
 * Create a new connection with custom parameters
 */
export function createConnection(
  endpoint?: string, 
  commitment?: Commitment
): Connection {
  return new Connection(
    endpoint || SOLANA_NETWORK, 
    commitment || COMMITMENT
  );
}

/**
 * Get the appropriate RPC endpoint for different networks
 */
export function getNetworkEndpoint(network: 'devnet' | 'mainnet-beta' | 'testnet' = 'devnet'): string {
  switch (network) {
    case 'mainnet-beta':
      return clusterApiUrl('mainnet-beta');
    case 'testnet':
      return clusterApiUrl('testnet');
    case 'devnet':
    default:
      return clusterApiUrl('devnet');
  }
}

/**
 * Check if we're connected to devnet
 */
export function isDevnet(): boolean {
  return SOLANA_NETWORK.includes('devnet');
}

/**
 * Check if we're connected to mainnet
 */
export function isMainnet(): boolean {
  return SOLANA_NETWORK.includes('mainnet');
}

/**
 * Get network name from RPC URL
 */
export function getNetworkName(): string {
  if (SOLANA_NETWORK.includes('devnet')) return 'devnet';
  if (SOLANA_NETWORK.includes('testnet')) return 'testnet';
  if (SOLANA_NETWORK.includes('mainnet')) return 'mainnet-beta';
  if (SOLANA_NETWORK.includes('localhost') || SOLANA_NETWORK.includes('127.0.0.1')) return 'localnet';
  return 'custom';
}

/**
 * Utility to wait for transaction confirmation
 */
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<boolean> {
  try {
    const result = await connection.confirmTransaction(signature, commitment);
    return !result.value.err;
  } catch (error) {
    console.error('Transaction confirmation failed:', error);
    return false;
  }
}

/**
 * Get account balance in SOL
 */
export async function getAccountBalance(
  connection: Connection,
  publicKey: string
): Promise<number> {
  try {
    const balance = await connection.getBalance(new (await import('@solana/web3.js')).PublicKey(publicKey));
    return balance / 1_000_000_000; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get account balance:', error);
    return 0;
  }
}

// PDA Helper Functions
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID || 'FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY';

/**
 * Get merchant PDA - based on merchant wallet address
 */
export function getMerchantPDA(merchantWallet: PublicKey | string): [PublicKey, number] {
  const walletPubkey = typeof merchantWallet === 'string' ? new PublicKey(merchantWallet) : merchantWallet;
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), walletPubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get transaction PDA - based on transaction ID bytes
 */
export function getTransactionPDA(transactionId: Uint8Array | string): [PublicKey, number] {
  const idBuffer = typeof transactionId === 'string' 
    ? Buffer.from(transactionId) 
    : Buffer.from(transactionId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("transaction"), idBuffer],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get transfer PDA - based on sender and transaction ID
 */
export function getTransferPDA(fromUser: PublicKey, transactionId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("transfer"), fromUser.toBuffer(), Buffer.from(transactionId)],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get redemption PDA - based on customer, merchant account, and transaction ID
 */
export function getRedemptionPDA(customerWallet: PublicKey, merchantAccount: PublicKey, transactionId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("redemption"), customerWallet.toBuffer(), merchantAccount.toBuffer(), Buffer.from(transactionId)],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get config PDA
 */
export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get mint authority PDA
 */
export function getMintAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Get transaction record PDA - based on customer and transaction ID
 */
export function getTransactionRecordPDA(customer: PublicKey, transactionId: Uint8Array): [PublicKey, number] {
  if (!customer) {
    throw new Error('Customer PublicKey is required for transaction record PDA generation');
  }
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from("transaction"), customer.toBuffer(), Buffer.from(transactionId)],
    new PublicKey(PROGRAM_ID)
  );
}
