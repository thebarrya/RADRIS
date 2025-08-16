import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    // Temporarily simplified to test NextAuth initialization
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Use explicit backend URL - in Docker environment, always use service name
          // Since NextAuth authorize runs on the server side, it's always in Docker context
          const backendUrl = 'http://backend:3001/api';
          
          const loginUrl = `${backendUrl}/auth/login`;
          console.log('🔐 Attempting login to:', loginUrl);
          
          const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log('📡 Login response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend login failed:', response.status, errorText);
            return null;
          }

          const data = await response.json();
          console.log('✅ Login response data:', { 
            hasToken: !!data.token, 
            hasUser: !!data.user,
            userRole: data.user?.role 
          });
          
          const { token, user } = data;

          if (token && user) {
            return {
              id: user.id,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              role: user.role,
              accessToken: token,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
};

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }

  interface User {
    role: string;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: string;
  }
}