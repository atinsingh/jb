import { importJWK, SignJWT } from 'jose';

/**
 * Mints access tokens indistinguishable from Supabase's, for the E2E suite.
 *
 * `setup-e2e.ts` generates a throwaway RSA keypair per run and hands the public
 * half to the app as `SUPABASE_JWKS_LOCAL`. This signs with the private half, so
 * tokens go through the exact same `jwtVerify` path as production — signature,
 * issuer, audience and expiry all really checked. Nothing is stubbed, and the
 * suite still never touches the network.
 */
const ISSUER = 'https://e2e.supabase.test/auth/v1';

export interface TestTokenClaims {
  sub: string;
  email: string;
  name?: string;
  /** Written into user_metadata, which is USER-WRITABLE — used to test that we do not trust it. */
  role?: string;
  /** Seconds from now until expiry. Pass a negative value to mint an expired token. */
  expiresInSeconds?: number;
}

export async function signTestAccessToken({
  sub,
  email,
  name,
  role,
  expiresInSeconds = 3600,
}: TestTokenClaims): Promise<string> {
  const jwk = JSON.parse(process.env.E2E_SIGNING_JWK as string);
  const key = await importJWK(jwk, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    email,
    user_metadata: { ...(name ? { name } : {}), ...(role ? { role } : {}) },
    app_metadata: { provider: 'email' },
  })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.E2E_SIGNING_KID as string })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(key);
}
