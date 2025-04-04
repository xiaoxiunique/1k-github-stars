import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { DefaultSession } from "next-auth";

// Extend Session type to include userId and access token
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
    userId?: string;
  }
}

// Extend JWT type
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    userId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      authorization: {
        params: {
          // Request user's permission to read starred content
          scope: "read:user user:email",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, account, user }) {
      // Save access token on initial login
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : undefined,
        };
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        // Add access token to session
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
}; 