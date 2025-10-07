import { PublicKey } from '@solana/web3.js';
import { ClientAnchorClient } from './client-anchor';
import { getConnection } from './solana';

export interface MerchantData {
  id?: string; // Database ID
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  walletAddress: string;
  merchantPDA: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  qrCodeUrl?: string;
  // Blockchain data
  onChainData?: {
    exists: boolean;
    accountInfo?: any;
  };
}

export interface MerchantService {
  getMerchantByWallet(walletAddress: string): Promise<MerchantData | null>;
  getAllMerchants(): Promise<MerchantData[]>;
}

export class MerchantDataService implements MerchantService {
  private connection = getConnection();

  /**
   * Get merchant data by wallet address - combines blockchain and database data
   */
  async getMerchantByWallet(walletAddress: string): Promise<MerchantData | null> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Create a mock wallet for the ClientAnchorClient
      const mockWallet = {
        publicKey: publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const client = new ClientAnchorClient({
        wallet: mockWallet,
        connection: this.connection
      });

      // Check blockchain data
      const onChainData = await client.getMerchantDataByWallet(publicKey);
      
      if (!onChainData) {
        return null; // No merchant account on blockchain
      }

      // Fetch database data
      const dbData = await this.fetchMerchantFromDatabase(walletAddress);
      
      // Combine blockchain and database data
      return {
        id: dbData?.id,
        name: dbData?.name || 'Unknown Merchant',
        category: dbData?.category || 'Other',
        cashbackRate: dbData?.cashbackRate || 500, // 5% default
        email: dbData?.email,
        phone: dbData?.phone,
        addressLine1: dbData?.addressLine1,
        city: dbData?.city,
        walletAddress: walletAddress,
        merchantPDA: onChainData.publicKey.toString(),
        isActive: dbData?.isActive ?? true,
        createdAt: dbData?.createdAt,
        updatedAt: dbData?.updatedAt,
        qrCodeUrl: dbData?.qrCodeUrl,
        onChainData: {
          exists: true,
          accountInfo: onChainData.accountInfo
        }
      };

    } catch (error) {
      console.error('Error fetching merchant by wallet:', error);
      return null;
    }
  }

  /**
   * Fetch merchant data from database API
   */
  private async fetchMerchantFromDatabase(walletAddress: string) {
    try {
      const response = await fetch(`/api/merchants/by-wallet/${walletAddress}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching from database API:', error);
      return null;
    }
  }

  /**
   * Get all merchants (this would need pagination in a real app)
   */
  async getAllMerchants(): Promise<MerchantData[]> {
    try {
      const response = await fetch('/api/merchants');
      if (!response.ok) {
        return [];
      }
      const merchants = await response.json();
      
      // For each merchant, also fetch blockchain data
      const enrichedMerchants = await Promise.all(
        merchants.map(async (merchant: any) => {
          const onChainData = await this.getOnChainData(merchant.walletAddress);
          return {
            ...merchant,
            onChainData
          };
        })
      );
      
      return enrichedMerchants;
    } catch (error) {
      console.error('Error fetching all merchants:', error);
      return [];
    }
  }

  /**
   * Get blockchain data for a wallet address
   */
  private async getOnChainData(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const mockWallet = {
        publicKey: publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const client = new ClientAnchorClient({
        wallet: mockWallet,
        connection: this.connection
      });

      const data = await client.getMerchantDataByWallet(publicKey);
      return {
        exists: !!data,
        accountInfo: data?.accountInfo
      };
    } catch {
      return {
        exists: false,
        accountInfo: null
      };
    }
  }

  /**
   * Check if a wallet has a merchant account on the blockchain
   */
  async walletHasMerchant(walletAddress: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const mockWallet = {
        publicKey: publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const client = new ClientAnchorClient({
        wallet: mockWallet,
        connection: this.connection
      });

      return await client.merchantExists();
    } catch {
      return false;
    }
  }
}

// Singleton instance
let merchantServiceInstance: MerchantDataService | null = null;

export function getMerchantService(): MerchantDataService {
  if (!merchantServiceInstance) {
    merchantServiceInstance = new MerchantDataService();
  }
  return merchantServiceInstance;
}
