import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  secret: 'hostamar-docker-local-dev-secret-2026',
  session: { strategy: 'jwt' },
  providers: [],
}
