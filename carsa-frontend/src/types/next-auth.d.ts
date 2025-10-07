import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string;
      walletAddress: string;
      isCustodial: boolean;
      isNewUser?: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name?: string;
    walletAddress: string;
    isCustodial: boolean;
    isNewUser?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    walletAddress?: string;
    isCustodial?: boolean;
    isNewUser?: boolean;
  }
}
