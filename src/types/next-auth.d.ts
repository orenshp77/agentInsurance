import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      logoUrl?: string
      agentId?: string
      profileCompleted?: boolean
    } & DefaultSession['user']
  }
}
