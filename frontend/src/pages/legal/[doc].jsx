'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';

const DOC_DATA = {
  terms: {
    kicker: 'Legal',
    title: 'Terms of Service',
    updated: 'June 12, 2026',
    intro: 'These terms govern your use of Jobocate’s products and services.',
    sections: [
      {
        id: 'acceptance',
        heading: '1. Acceptance of terms',
        paras: [
          'By accessing or using Jobocate, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use the service.',
          'We may update these terms from time to time. Continued use after changes take effect constitutes acceptance of the revised terms.',
        ],
      },
      {
        id: 'accounts',
        heading: '2. Your account',
        paras: [
          'You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must provide accurate information and keep it current.',
        ],
      },
      {
        id: 'acceptable-use',
        heading: '3. Acceptable use',
        paras: [
          'You agree not to misuse the service, including by scraping, reverse-engineering, or using automated systems to access it outside our published API. You may not use Jobocate to submit fraudulent applications or misrepresent your identity.',
        ],
      },
      {
        id: 'ai',
        heading: '4. AI features',
        paras: [
          'Our AI features assist with drafting, matching, screening, and scheduling. AI output may contain errors; you remain responsible for reviewing it before acting. Consequential actions require human confirmation.',
        ],
      },
      {
        id: 'termination',
        heading: '5. Termination',
        paras: [
          'You may stop using the service at any time. We may suspend or terminate access for violations of these terms. On termination, your right to use the service ends, though certain provisions survive.',
        ],
      },
      {
        id: 'liability',
        heading: '6. Limitation of liability',
        paras: [
          'To the maximum extent permitted by law, Jobocate is not liable for indirect, incidental, or consequential damages arising from your use of the service.',
        ],
      },
    ],
  },
  privacy: {
    kicker: 'Legal',
    title: 'Privacy Policy',
    updated: 'June 12, 2026',
    intro: 'How we collect, use, and protect your personal information.',
    sections: [
      {
        id: 'collect',
        heading: '1. Information we collect',
        paras: [
          'We collect information you provide directly — such as your résumé, profile, and applications — as well as usage data generated when you interact with the service.',
        ],
      },
      {
        id: 'use',
        heading: '2. How we use it',
        paras: [
          'We use your information to match you with roles, power AI features, improve the product, and communicate with you. We do not sell your personal data.',
        ],
      },
      {
        id: 'sharing',
        heading: '3. Sharing',
        paras: [
          'We share data with employers when you apply, and with sub-processors who help us operate the service under contract. A current list of sub-processors is available on our Security page.',
        ],
      },
      {
        id: 'rights',
        heading: '4. Your rights',
        paras: [
          'Depending on your location, you may request access to, correction of, or deletion of your personal data. You can exercise these rights from your account settings or by contacting us.',
        ],
      },
      {
        id: 'retention',
        heading: '5. Retention',
        paras: [
          'We retain personal data only as long as necessary to provide the service and meet legal obligations. Configurable retention windows apply to candidate records.',
        ],
      },
    ],
  },
  cookies: {
    kicker: 'Legal',
    title: 'Cookie Policy',
    updated: 'June 12, 2026',
    intro: 'How and why we use cookies and similar technologies.',
    sections: [
      {
        id: 'what',
        heading: '1. What cookies are',
        paras: [
          'Cookies are small text files stored on your device that help websites function and remember preferences.',
        ],
      },
      {
        id: 'types',
        heading: '2. Types we use',
        paras: [
          'We use strictly necessary cookies for authentication and security, plus optional analytics cookies to understand usage. Analytics cookies are off until you consent.',
        ],
      },
      {
        id: 'manage',
        heading: '3. Managing cookies',
        paras: [
          'You can manage your cookie preferences at any time from the banner or your browser settings. Disabling necessary cookies may break parts of the service.',
        ],
      },
    ],
  },
  dpa: {
    kicker: 'Legal',
    title: 'Data Processing Addendum',
    updated: 'June 12, 2026',
    intro: 'Terms governing our processing of personal data on your behalf (GDPR).',
    sections: [
      {
        id: 'roles',
        heading: '1. Roles of the parties',
        paras: [
          'For data you submit, you act as the controller and Jobocate acts as the processor, processing personal data only on your documented instructions.',
        ],
      },
      {
        id: 'security',
        heading: '2. Security measures',
        paras: [
          'We maintain technical and organizational measures appropriate to the risk, including encryption, access controls, and regular testing, as described on our Security page.',
        ],
      },
      {
        id: 'subprocessors',
        heading: '3. Sub-processors',
        paras: [
          'We engage sub-processors under written contracts imposing equivalent data-protection obligations. We notify you of changes and give you the opportunity to object.',
        ],
      },
      {
        id: 'transfers',
        heading: '4. International transfers',
        paras: [
          'Where personal data is transferred outside the EEA, we rely on Standard Contractual Clauses and supplementary measures.',
        ],
      },
      {
        id: 'rights',
        heading: '5. Data-subject requests',
        paras: [
          'We assist you in responding to data-subject requests and in fulfilling your obligations under applicable data-protection law.',
        ],
      },
    ],
  },
};

const DOC_DEFS = [
  { key: 'terms', label: 'Terms of Service' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'cookies', label: 'Cookie Policy' },
  { key: 'dpa', label: 'DPA / GDPR' },
];

const VALID = new Set(DOC_DEFS.map((d) => d.key));

export default function LegalDoc() {
  const router = useRouter();
  const [doc, setDoc] = useState('terms');

  // Sync the active document from the [doc] route param once it's available.
  useEffect(() => {
    if (!router.isReady) return;
    const param = Array.isArray(router.query.doc) ? router.query.doc[0] : router.query.doc;
    if (param && VALID.has(param)) setDoc(param);
    else setDoc('terms');
  }, [router.isReady, router.query.doc]);

  const pick = (key) => {
    setDoc(key);
    if (router.isReady) {
      router.replace(`/legal/${key}`, undefined, { shallow: true, scroll: false });
    }
  };

  const cur = DOC_DATA[doc] || DOC_DATA.terms;

  return (
    <>
      <Head>
        <title>{cur.title} — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #1fa463;
          color: #f7f3ea;
        }
        #emkt .legal-toc-link:hover {
          color: #157a49 !important;
          border-left-color: #1fa463 !important;
        }
        #emkt .legal-contact-link:hover {
          text-decoration: underline !important;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: '#1B1A16',
          background: '#F7F3EA',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* DOC SWITCHER */}
        <div style={{ borderBottom: '1px solid #E7E0D2', background: '#F7F3EA' }}>
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '18px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
                marginRight: 6,
              }}
            >
              Legal
            </span>
            {DOC_DEFS.map((d) => {
              const on = doc === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => pick(d.key)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? '#0C2C1C' : '#46413A',
                    background: on ? '#1FA463' : '#FFFEFB',
                    border: `1px solid ${on ? '#1FA463' : '#E1D9C9'}`,
                    borderRadius: 999,
                    padding: '7px 15px',
                    cursor: 'pointer',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '40px 32px 72px',
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 48,
            alignItems: 'start',
          }}
        >
          {/* STICKY SECTION NAV */}
          <nav style={{ position: 'sticky', top: 96 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
                marginBottom: 14,
              }}
            >
              On this page
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                borderLeft: '1px solid #E1D9C9',
              }}
            >
              {cur.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="legal-toc-link"
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.4,
                    color: '#5A544A',
                    textDecoration: 'none',
                    padding: '7px 0 7px 16px',
                    marginLeft: -1,
                    borderLeft: '2px solid transparent',
                  }}
                >
                  {s.heading}
                </a>
              ))}
            </div>
          </nav>

          {/* DOCUMENT */}
          <article>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#1FA463',
                marginBottom: 12,
              }}
            >
              {cur.kicker}
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 44,
                lineHeight: 1.05,
                margin: '0 0 10px',
              }}
            >
              {cur.title}
            </h1>
            <p style={{ fontSize: 14, color: '#8A8378', margin: '0 0 8px' }}>{cur.intro}</p>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 12,
                color: '#A79E8F',
                paddingBottom: 28,
                marginBottom: 8,
                borderBottom: '1px solid #E7E0D2',
              }}
            >
              Last updated · {cur.updated}
            </div>

            {cur.sections.map((s) => (
              <section key={s.id} id={s.id} style={{ paddingTop: 24, marginBottom: 8 }}>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.15,
                    margin: '0 0 14px',
                  }}
                >
                  {s.heading}
                </h2>
                {s.paras.map((p, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.72,
                      color: '#2A2820',
                      margin: '0 0 16px',
                    }}
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}

            <div
              style={{
                marginTop: 32,
                padding: 22,
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>
                Questions about this document?
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5A544A', margin: 0 }}>
                Contact{' '}
                <a
                  href="mailto:legal@jobocate.com"
                  className="legal-contact-link"
                  style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}
                >
                  legal@jobocate.com
                </a>{' '}
                or write to Jobocate, Inc., 548 Market St, San Francisco, CA 94104.
              </p>
            </div>
          </article>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
