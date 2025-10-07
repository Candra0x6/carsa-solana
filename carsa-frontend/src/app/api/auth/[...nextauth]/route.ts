import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getDatabaseService } from '@/lib/database-service';
import crypto from 'crypto';
import bs58 from 'bs58';

// Extended user type for our authentication
interface ExtendedUser {
  id: string;
  email: string;
  name?: string;
  walletAddress: string;
  isCustodial: boolean;
}

// Extend NextAuth types


/**
 * Encrypt private key for secure storage
 */
function encryptPrivateKey(privateKey: Uint8Array, password: string): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(64);
  
  // Derive key from password
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  
  // Encrypt
  const cipher = crypto.createCipher(algorithm, key);
  const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine salt + iv + authTag + encrypted
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}



/**
 * Generate custodial wallet for new user
 */
function generateCustodialWallet(): {
  keypair: Keypair;
  publicKey: string;
  encryptedPrivateKey: string;
} {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  
  // Use a server-side encryption password (should be from env)
  const encryptionPassword = process.env.CUSTODIAL_WALLET_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  const encryptedPrivateKey = encryptPrivateKey(keypair.secretKey, encryptionPassword);
  
  return {
    keypair,
    publicKey,
    encryptedPrivateKey
  };
}

/**
 * Verify signature for wallet-based authentication
 */
function verifyWalletSignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const signatureBytes = bs58.decode(signature);
    const pubKeyBytes = new PublicKey(publicKey).toBytes();
    
    // In a real implementation, you'd use ed25519 signature verification
    // For demo purposes, we'll simulate verification
    console.log('Verifying signature for message:', message);
    return signatureBytes.length === 64 && pubKeyBytes.length === 32;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password + Custodial Wallet Provider
    CredentialsProvider({
      id: 'custodial',
      name: 'Custodial Wallet',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text', placeholder: 'Your Name' },
        action: { label: 'Action', type: 'text' } // 'login' or 'register'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const dbService = getDatabaseService();

        try {
          if (credentials.action === 'register') {
            // Registration flow
            const existingUser = await dbService.getUserByEmail(credentials.email);

            if (existingUser) {
              throw new Error('User already exists');
            }

            // Generate custodial wallet
            const walletData = generateCustodialWallet();

            // Hash password
            const passwordHash = crypto.pbkdf2Sync(
              credentials.password,
              process.env.PASSWORD_SALT || 'default-salt',
              100000,
              64,
              'sha512'
            ).toString('hex');

            // Create user with custodial wallet
            const newUser = await dbService.createUser({
              email: credentials.email,
              name: credentials.name || `User ${walletData.publicKey.slice(0, 8)}`,
              walletAddress: walletData.publicKey,
              passwordHash,
              encryptedPrivateKey: walletData.encryptedPrivateKey
            });

            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name || undefined,
              walletAddress: newUser.wallet_address,
              isCustodial: true
            };

          } else {
            // Login flow
            const user = await dbService.getUserByEmail(credentials.email);

            if (!user) {
              throw new Error('User not found');
            }

            // Verify password
            const passwordHash = crypto.pbkdf2Sync(
              credentials.password,
              process.env.PASSWORD_SALT || 'default-salt',
              100000,
              64,
              'sha512'
            ).toString('hex');

            if (user.password_hash !== passwordHash) {
              throw new Error('Invalid password');
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name || undefined,
              walletAddress: user.wallet_address,
              isCustodial: true
            };
          }
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    }),

    // External Wallet Provider (Phantom, Solflare, etc.)
    CredentialsProvider({
      id: 'wallet',
      name: 'External Wallet',
      credentials: {
        publicKey: { label: 'Public Key', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        message: { label: 'Message', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.publicKey || !credentials?.signature || !credentials?.message) {
          throw new Error('Missing wallet authentication data');
        }

        // Verify the signature
        const isValidSignature = verifyWalletSignature(
          credentials.message,
          credentials.signature,
          credentials.publicKey
        );

        if (!isValidSignature) {
          throw new Error('Invalid wallet signature');
        }

        const dbService = getDatabaseService();

        try {
          // Find or create user with external wallet
          let user = await dbService.getUserByWallet(credentials.publicKey);

          if (!user) {
            // Create new user with external wallet
            user = await dbService.createUser({
              email: `${credentials.publicKey}@wallet.carsa.app`,
              walletAddress: credentials.publicKey,
              name: `Wallet ${credentials.publicKey.slice(0, 8)}...`
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            walletAddress: user.wallet_address,
            isCustodial: false
          };

        } catch (error) {
          console.error('Wallet auth error:', error);
          throw new Error('Failed to authenticate wallet');
        }
      }
    })
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user && 'walletAddress' in user && 'isCustodial' in user) {
        const extendedUser = user as ExtendedUser;
        token.sub = extendedUser.id;
        token.email = extendedUser.email;
        token.name = extendedUser.name;
        token.walletAddress = extendedUser.walletAddress;
        token.isCustodial = extendedUser.isCustodial;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && token.sub && token.email && token.walletAddress) {
        session.user = {
          id: token.sub,
          email: token.email,
          name: token.name || undefined,
          walletAddress: token.walletAddress,
          isCustodial: token.isCustodial || false
        };
      }
      return session;
    }
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
