import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Enhanced user session type with wallet information
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  walletAddress: string;
  isNewUser?: boolean;
}

/**
 * Authentication middleware for API routes
 * Validates session and extracts user information
 */
export const withAuth = <T = Record<string, unknown>>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    context?: T
  ) => Promise<NextResponse>
) => {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      // Get session from NextAuth
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json(
          { 
            error: 'Authentication required',
            message: 'Please sign in to access this resource'
          },
          { status: 401 }
        );
      }

      // Extract user information with wallet address
      const user: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        walletAddress: session.user.walletAddress,
        isNewUser: session.user.isNewUser
      };

      // Validate wallet address exists
      if (!user.walletAddress) {
        console.error('User session missing wallet address:', user.id);
        return NextResponse.json(
          { 
            error: 'Invalid session',
            message: 'User session is missing wallet information'
          },
          { status: 500 }
        );
      }

      // Call the protected handler with authenticated user
      return await handler(request, user, context);

    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'Session validation error'
        },
        { status: 500 }
      );
    }
  };
};

/**
 * Optional authentication middleware
 * Passes user if authenticated, null if not
 */
export const withOptionalAuth = <T = Record<string, unknown>>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser | null,
    context?: T
  ) => Promise<NextResponse>
) => {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      // Get session from NextAuth
      const session = await getServerSession(authOptions);

      let user: AuthenticatedUser | null = null;

      if (session && session.user) {
        user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          walletAddress: session.user.walletAddress,
          isNewUser: session.user.isNewUser
        };
      }

      // Call handler with optional user
      return await handler(request, user, context);

    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      // Continue without authentication on error
      return await handler(request, null, context);
    }
  };
};

/**
 * Utility function to get authenticated user from request
 * For use outside of middleware pattern
 */
export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.walletAddress) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      walletAddress: session.user.walletAddress,
      isNewUser: session.user.isNewUser
    };

  } catch (error) {
    console.error('Get authenticated user error:', error);
    return null;
  }
};
