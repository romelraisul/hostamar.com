import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import GitHubProvider from 'next-auth/providers/github'
import AzureADProvider from 'next-auth/providers/azure-ad'
import TwitterProvider from 'next-auth/providers/twitter'
import LinkedInProvider from 'next-auth/providers/linkedin'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// Note: PrismaAdapter not installed — using custom JWT auth instead
// If you want NextAuth DB sessions, run: npm install @next-auth/prisma-adapter

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // disabled — @next-auth/prisma-adapter not installed
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      },
    },
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },

  providers: [
    // Email/Password (existing)
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.customer.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),

    // Google SSO
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [{
      ...GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),

    // Facebook SSO
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? [{
      ...FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID as string,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),

    // GitHub SSO
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [{
      ...GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),

    // Microsoft Azure AD SSO
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET ? [{
      ...AzureADProvider({
        clientId: process.env.MICROSOFT_CLIENT_ID as string,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
        tenantId: 'common',
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),

    // Twitter/X SSO
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET ? [{
      ...TwitterProvider({
        clientId: process.env.TWITTER_CLIENT_ID as string,
        clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
        version: '2.0',
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),

    // LinkedIn SSO
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ? [{
      ...LinkedInProvider({
        clientId: process.env.LINKEDIN_CLIENT_ID as string,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
      }),
    }] : []),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role || 'customer'
      }
      // SSO: link or create user on first login
      if (account?.provider && account?.provider !== 'credentials' && user?.email) {
        const existing = await prisma.customer.findUnique({
          where: { email: user.email },
        })
        if (!existing) {
          // Create new customer from SSO
          const newCustomer = await prisma.customer.create({
            data: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              password: bcrypt.hashSync(Math.random().toString(36), 10),
              role: 'customer',
              source: account.provider,
              stage: 'lead',
            },
          })
          token.id = newCustomer.id
          token.role = newCustomer.role
        } else {
          token.id = existing.id
          token.role = existing.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).role = (token as any).role || 'customer'
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },
}
