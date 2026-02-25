import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Fallback when AUTH_SECRET is not set (e.g. Vercel env not configured). Set AUTH_SECRET for secure sessions.
const authSecret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'development' ? 'dev-secret-change-in-production' : undefined) ||
  (typeof process.env.VERCEL === 'string' ? `datrep-vercel-${process.env.VERCEL_URL ?? 'preview'}` : undefined);

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET && typeof globalThis !== 'undefined') {
  (globalThis as unknown as { __authSecretWarned?: boolean }).__authSecretWarned ??= false;
  if (!(globalThis as unknown as { __authSecretWarned?: boolean }).__authSecretWarned) {
    (globalThis as unknown as { __authSecretWarned?: boolean }).__authSecretWarned = true;
    console.warn('[auth] AUTH_SECRET is not set. Set it in Vercel (or your host) for secure sessions: https://errors.authjs.dev#missingsecret');
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  secret: authSecret,
});
