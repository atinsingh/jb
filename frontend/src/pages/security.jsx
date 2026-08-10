'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const BADGES = [
  { title: 'SOC 2 Type II', desc: 'Audited annually by an independent firm' },
  { title: 'GDPR & CCPA', desc: 'Full data-subject rights tooling' },
  { title: 'AES-256', desc: 'Encrypted at rest and in transit (TLS 1.3)' },
  { title: 'SAML SSO', desc: 'SSO, SCIM and enforced 2FA' },
];

const PILLARS = [
  { icon: '🔒', title: 'Encryption everywhere', body: 'Data is encrypted at rest with AES-256 and in transit with TLS 1.3. Secrets are managed in a dedicated KMS with strict rotation.' },
  { icon: '⛨', title: 'Least-privilege access', body: 'Role-based access, mandatory 2FA, and full audit logging. Production access is time-boxed and reviewed quarterly.' },
  { icon: '◷', title: 'Resilience & backups', body: 'Encrypted, geo-redundant backups with tested restore procedures and a documented disaster-recovery plan.' },
  { icon: '◎', title: 'Continuous monitoring', body: '24/7 anomaly detection, dependency scanning, and annual third-party penetration testing.' },
  { icon: '⇲', title: 'Data isolation', body: 'Tenant data is logically isolated; candidate and employer records are scoped and never used to train shared models.' },
  { icon: '✎', title: 'Configurable retention', body: 'Set retention windows per data type — rejected candidates, recordings, talent pool — with auto-deletion on request.' },
];

const HANDLING = [
  'Data residency in US or EU regions on request',
  'A signed DPA available for every customer',
  'Candidate data-export and erasure within SLA',
  'No selling or sharing of personal data, ever',
];

const ACCESS = [
  'SAML 2.0 SSO with your IdP (Okta, Azure AD, Google)',
  'SCIM provisioning and deprovisioning',
  'Enforced two-factor authentication org-wide',
  'Granular role & permission matrix with audit logs',
];

const AI_POINTS = [
  'AI ranks and recommends — humans approve every consequential action.',
  'Candidates are notified before any AI screening interview.',
  'Models are evaluated for bias; your data never trains shared models.',
];

const SUBPROCESSORS = [
  { name: 'Amazon Web Services', purpose: 'Cloud hosting & storage', region: 'US / EU' },
  { name: 'Anthropic', purpose: 'AI model inference', region: 'US' },
  { name: 'Stripe', purpose: 'Payment processing', region: 'US' },
  { name: 'Twilio SendGrid', purpose: 'Transactional email', region: 'US' },
].map((s, i, arr) => ({ ...s, divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent' }));

export default function Security() {
  const demo = appRoute('Book Demo.dc.html');

  return (
    <>
      <Head>
        <title>Security &amp; Trust — Jobocate</title>
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: 'var(--jb-font-sans)', color: 'var(--jb-d-ink)', background: 'transparent' }}>
        <PublicLayout>

        {/* HERO (dark) */}
        <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-d-footer)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 78% 12%, rgba(31,164,99,0.3), transparent 55%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '60px 32px 56px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— Trust &amp; security</div>
            <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 52px)', lineHeight: 1.04, color: '#FBF8F1', margin: '0 0 16px' }}>Security your team can verify, not just trust.</h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: '0 auto 30px', maxWidth: 520 }}>Every candidate and employer record is encrypted, access-controlled, and logged. Your security team gets the certifications, controls, and documentation to confirm it — not just our word.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={demo} style={{ background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}>Request security docs</Link>
              <a href="#subprocessors" style={{ background: 'transparent', color: '#FBF8F1', fontSize: 15, fontWeight: 600, padding: '13px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid #3A382E' }}>View sub-processors</a>
            </div>
          </div>
        </section>

        {/* BADGE STRIP (dark continuation) */}
        <section style={{ background: 'var(--jb-d-footer)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 60px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
              {BADGES.map((b) => (
                <div key={b.title} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 14, padding: 22, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--jb-d-accent)', marginBottom: 7 }}>{b.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--jb-d-ink-55)', lineHeight: 1.4 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 32px 20px' }}>
          <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 36px)', lineHeight: 1.06, textAlign: 'center', margin: '0 0 36px' }}>How your data stays protected</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
            {PILLARS.map((p) => (
              <div key={p.title} style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 24 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--jb-d-accent-tint)', color: 'var(--jb-d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 14 }}>{p.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 7px' }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DATA HANDLING + ACCESS */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 26 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>Data handling &amp; privacy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {HANDLING.map((h) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 14, lineHeight: 1.5, color: 'var(--jb-d-ink-85)' }}><span style={{ color: 'var(--jb-d-accent)', flexShrink: 0, marginTop: 1 }}>✓</span>{h}</div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 26 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>Access &amp; identity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ACCESS.map((a) => (
                  <div key={a} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 14, lineHeight: 1.5, color: 'var(--jb-d-ink-85)' }}><span style={{ color: 'var(--jb-d-accent)', flexShrink: 0, marginTop: 1 }}>✓</span>{a}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RESPONSIBLE AI */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px 36px' }}>
          <div style={{ background: 'var(--jb-d-accent-tint)', border: '1px solid #CDE9D6', borderRadius: 20, padding: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 12 }}>✦ Responsible AI</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.1, margin: 0, color: '#1F4733' }}>AI ranks and recommends. People decide.</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {AI_POINTS.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 14.5, lineHeight: 1.55, color: '#1F4733' }}><span style={{ color: 'var(--jb-d-accent)', flexShrink: 0, marginTop: 1 }}>✓</span>{p}</div>
              ))}
            </div>
          </div>
        </section>

        {/* SUB-PROCESSORS */}
        <section id="subprocessors" style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px 40px' }}>
          <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: '0 0 16px' }}>Sub-processors</h2>
          <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 10, padding: '12px 22px', background: 'var(--jb-d-glass)', borderBottom: '1px solid #F2ECE0' }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>Provider</span>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>Purpose</span>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>Region</span>
            </div>
            {SUBPROCESSORS.map((s) => (
              <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${s.divider}` }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--jb-d-ink)' }}>{s.name}</span>
                <span style={{ fontSize: 13, color: 'var(--jb-d-ink-70)' }}>{s.purpose}</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>{s.region}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-d-footer)', borderRadius: 24, padding: '56px 44px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(31,164,99,0.32), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 36px)', lineHeight: 1.06, color: '#FBF8F1', margin: '0 0 12px' }}>Everything your security review needs.</h2>
              <p style={{ fontSize: 15.5, color: 'var(--jb-d-ink-65)', margin: '0 auto 26px', maxWidth: 440 }}>SOC 2 report, penetration-test summary, DPA, and completed security questionnaire — shared under NDA.</p>
              <Link href={demo} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 16, fontWeight: 700, padding: '15px 28px', borderRadius: 999, textDecoration: 'none' }}>Request security docs →</Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
