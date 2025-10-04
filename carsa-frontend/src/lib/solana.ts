import { Connection, PublicKey, clusterApiUrl, Commitment } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'testnet' | 'mainnet-beta';
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK);
export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID!);

// Connection settings
const commitment: Commitment = 'confirmed';
const connection = new Connection(RPC_URL, commitment);

/**
 * Get Solana connection instance
 * @returns Connection instance configured for the current network
 */
export const getConnection = (): Connection => {
  return connection;
};

/**
 * Get Anchor provider for program interactions
 * @param wallet - Wallet adapter instance
 * @returns AnchorProvider instance
 */
export const getProvider = (wallet: any): AnchorProvider => {
  return new AnchorProvider(connection, wallet, {
    preflightCommitment: commitment,
  });
};

/**
 * Get Anchor program instance
 * @param provider - Anchor provider
 * @param idl - Program IDL
 * @returns Program instance for Carsa smart contract
 */
export const getProgram = (provider: AnchorProvider, idl: Idl): Program => {
  return new Program(idl, PROGRAM_ID, provider);
};

/**
 * Derive PDA for config account
 * @returns [PublicKey, number] - Config PDA and bump
 */
export const getConfigPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
};

/**
 * Derive PDA for mint authority
 * @returns [PublicKey, number] - Mint authority PDA and bump
 */
export const getMintAuthorityPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mint_authority')],
    PROGRAM_ID
  );
};

/**
 * Derive PDA for merchant account
 * @param merchantWallet - Merchant wallet public key
 * @returns [PublicKey, number] - Merchant PDA and bump
 */
export const getMerchantPDA = (merchantWallet: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), merchantWallet.toBuffer()],
    PROGRAM_ID
  );
};

/**
 * Derive PDA for transaction record
 * @param customer - Customer wallet public key
 * @param transactionId - Unique transaction ID (32 bytes)
 * @returns [PublicKey, number] - Transaction PDA and bump
 */
export const getTransactionPDA = (
  customer: PublicKey,
  transactionId: Uint8Array
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('transaction'), customer.toBuffer(), Buffer.from(transactionId)],
    PROGRAM_ID
  );
};

/**
 * Derive PDA for token transfer record
 * @param sender - Sender wallet public key
 * @param transactionId - Unique transaction ID (32 bytes)
 * @returns [PublicKey, number] - Transfer PDA and bump
 */
export const getTransferPDA = (
  sender: PublicKey,
  transactionId: Uint8Array
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('transfer'), sender.toBuffer(), Buffer.from(transactionId)],
    PROGRAM_ID
  );
};

/**
 * Derive PDA for token redemption record
 * @param customer - Customer wallet public key
 * @param merchant - Merchant account public key
 * @param transactionId - Unique transaction ID (32 bytes)
 * @returns [PublicKey, number] - Redemption PDA and bump
 */
export const getRedemptionPDA = (
  customer: PublicKey,
  merchant: PublicKey,
  transactionId: Uint8Array
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('redemption'),
      customer.toBuffer(),
      merchant.toBuffer(),
      Buffer.from(transactionId)
    ],
    PROGRAM_ID
  );
};

// Export commonly used constants
export { TOKEN_PROGRAM_ID, connection };
export type { Connection, PublicKey, AnchorProvider, Program };
