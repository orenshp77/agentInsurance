import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { serverLogInfo, serverLogWarn } from './serverLogger'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Required for Cloud Run and production deployments
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })
        } catch (dbError) {
          serverLogWarn(`AUTH: Database error during login (${credentials.email})`, {
            category: 'AUTH',
            metadata: { attemptedEmail: credentials.email, error: String(dbError) },
          })
          throw new Error('SYSTEM_ERROR')
        }

        if (!user) {
          serverLogWarn(`AUTH: Login failed - user not found (${credentials.email})`, {
            category: 'AUTH',
            metadata: { attemptedEmail: credentials.email },
          })
          return null
        }

        let isPasswordValid
        try {
          isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )
        } catch (bcryptError) {
          serverLogWarn(`AUTH: Bcrypt error during login (${credentials.email})`, {
            category: 'AUTH',
            metadata: { attemptedEmail: credentials.email, error: String(bcryptError) },
          })
          throw new Error('SYSTEM_ERROR')
        }

        if (!isPasswordValid) {
          serverLogWarn(`AUTH: Login failed - wrong password (${credentials.email})`, {
            category: 'AUTH',
            metadata: { attemptedEmail: credentials.email, userId: user.id },
          })
          return null
        }

        // Record login activity
        try {
          await prisma.activity.create({
            data: {
              type: 'LOGIN',
              description: `${user.name} התחבר למערכת`,
              userId: user.id,
              userName: user.name,
              userRole: user.role,
            },
          })
        } catch (error) {
          console.error('Error recording login activity:', error)
        }

        // Log successful login
        serverLogInfo(`AUTH: Login success - ${user.name} (${user.email}) [${user.role}]`, {
          category: 'AUTH',
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          metadata: { email: user.email },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          logoUrl: user.logoUrl,
          agentId: user.agentId,
          profileCompleted: user.profileCompleted,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.logoUrl = (user as { logoUrl?: string }).logoUrl
        token.agentId = (user as { agentId?: string }).agentId
        token.profileCompleted = (user as { profileCompleted?: boolean }).profileCompleted
      }

      // When session is updated (e.g., after profile completion), refetch user data
      if (trigger === 'update' && token.id) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            profileCompleted: true,
            logoUrl: true,
            role: true,
            agentId: true,
          },
        })
        if (freshUser) {
          token.profileCompleted = freshUser.profileCompleted
          token.logoUrl = freshUser.logoUrl
          token.role = freshUser.role
          token.agentId = freshUser.agentId
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.logoUrl = token.logoUrl as string | undefined
        session.user.agentId = token.agentId as string | undefined
        session.user.profileCompleted = token.profileCompleted as boolean | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})
