import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  // In production (e.g. Vercel) set AUTH_SECRET in env to fix "MissingSecret" — https://errors.authjs.dev#missingsecret
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-change-in-production' : undefined),
});
