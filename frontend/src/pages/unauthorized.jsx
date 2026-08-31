'use client';

import Head from 'next/head';
import Link from 'next/link';

import Logo from '@/components/brand/Logo';
import { useAuth } from '@/context/AuthContext';
import styles from '@/components/auth/v3/AuthV3.module.css';

/**
 * Role-denied landing, Candidate v3.
 *
 * Reached when an authenticated user opens a surface their role does not own -
 * most often a non-admin on `/admin/*`. Not an auth failure: the session is
 * valid, the permission is not.
 *
 * The previous version was grey Tailwind with a lock emoji and a shadowed card,
 * which broke three v3 rules at once (no emoji, no shadows, tokens only).
 */
export default function Unauthorized() {
  const { user } = useAuth();

  // Send people somewhere useful rather than dumping everyone on the marketing
  // home. A signed-in employer wants their dashboard, not the landing page.
  const home =
    user?.role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : user?.role === 'ROLE_AGENT'
        ? '/agent/dashboard'
        : user
          ? '/app/dashboard'
          : '/';

  return (
    <>
      <Head>
        <title>Access denied · Jobocate</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={`jb jbv3 ${styles.page}`}>
        <div className={styles.dots} aria-hidden="true" />

        <header className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label="Jobocate home">
            <Logo size={22} />
          </Link>
          <Link href="/app/support" className={styles.barLink}>
            Contact support
          </Link>
        </header>

        <div className={styles.shellOuter}>
          <div className={styles.grid}>
            <section className={styles.formCell}>
              <div className={styles.form}>
                <p className={styles.monoLabel}>403</p>
                <h1 className={styles.h1}>You do not have access to this page.</h1>
                <p className={styles.lede}>
                  Your account is signed in, but this area belongs to a different role. If you
                  think that is wrong, support can check it.
                </p>

                <Link href={home} className={`${styles.btn} ${styles.btnPrimary}`}>
                  {user ? 'Back to your dashboard' : 'Back to home'}
                </Link>
              </div>
            </section>

            <aside className={styles.asideCell}>
              <p className={styles.asideHead}>Roles keep each surface separate.</p>
              <p className={styles.asideNote}>
                Candidates, employers, career agents and admins each see their own workspace.
                Nothing here is shared between them.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
