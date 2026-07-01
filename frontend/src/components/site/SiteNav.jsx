'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

const PRODUCT_ITEMS = [
  { tag: 'AA', title: 'Auto-Apply', desc: 'We apply to verified roles for you, automatically.', dc: 'Auto-Apply.dc.html', tint: '#EAF6EE', ink: '#157A49' },
  { tag: 'RB', title: 'AI Resume Builder', desc: 'ATS-optimized resumes tailored to each role.', dc: 'Resume Builder.dc.html', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'JM', title: 'Smart Job Matching', desc: 'Fresh, relevant roles surfaced daily.', dc: 'Job Matching.dc.html', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'CL', title: 'Cover Letters', desc: 'Personalized letters in a single click.', dc: 'Cover Letters.dc.html', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'AT', title: 'Application Tracker', desc: 'Every application and interview in one view.', dc: 'App Tracker.dc.html', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'IP', title: 'Interview Prep', desc: 'AI mock interviews with instant feedback.', dc: 'Interview Prep.dc.html', tint: '#F4EFE4', ink: '#1B1A16' },
];

const SOLUTION_ITEMS = [
  { tag: 'NG', title: 'New grads', desc: 'Land your first role without the spray-and-pray.' },
  { tag: 'CS', title: 'Career switchers', desc: 'Reframe your experience for a new field.' },
  { tag: 'IC', title: 'Senior ICs & managers', desc: 'Target the right level, quietly and fast.' },
  { tag: 'AS', title: 'Active seekers', desc: 'Maximize volume without losing quality.' },
];

const RESOURCE_ITEMS = [
  { title: 'Help Center', desc: 'Guides & answers' },
  { title: 'Blog', desc: 'Job-search playbooks' },
  { title: 'Resume Guides', desc: 'Templates & tips' },
  { title: 'API Docs', desc: 'Build on Jobocate' },
  { title: 'Webinars', desc: 'Live sessions' },
  { title: 'Changelog', desc: "What's new" },
];

export default function SiteNav() {
  const [menu, setMenu] = useState(null);

  const close = () => setMenu(null);

  const panel = (name) => ({
    opacity: menu === name ? 1 : 0,
    visibility: menu === name ? 'visible' : 'hidden',
    transform: `translateY(${menu === name ? '0px' : '-8px'})`,
    pointerEvents: menu === name ? 'auto' : 'none',
  });
  const trigColor = (name) => (menu === name ? '#1B1A16' : '#46413A');
  const trigArrow = (name) => (menu === name ? 'rotate(180deg)' : 'rotate(0deg)');

  const flyoutWrap = (name) => ({
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    ...panel(name),
  });

  const triggerBtn = (name) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 500,
    color: trigColor(name),
    padding: '9px 14px',
    borderRadius: 8,
  });

  const arrowStyle = (name) => ({
    fontSize: 10,
    transform: trigArrow(name),
    transition: 'transform 0.2s',
    color: '#1FA463',
  });

  const plainLink = {
    fontSize: 15,
    fontWeight: 500,
    color: '#46413A',
    padding: '9px 14px',
    borderRadius: 8,
    textDecoration: 'none',
  };

  const panelCardBase = {
    width: '100%',
    background: '#FFFEFB',
    border: '1px solid #E6DECF',
    borderTop: 'none',
    boxShadow: '0 30px 60px -30px rgba(27,26,22,0.35)',
  };

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbnav *,
        #jbnav *::before,
        #jbnav *::after {
          box-sizing: border-box;
        }
        #jbnav a {
          text-decoration: none;
        }
        #jbnav .jbnav-item:hover {
          background: #f4efe4;
        }
      `}</style>

      <div
        id="jbnav"
        style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}
        onMouseLeave={close}
      >
        <header style={{ position: 'relative', zIndex: 60, background: '#F7F3EA', borderBottom: '1px solid #E7E0D2' }}>
          <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ display: 'flex', alignItems: 'center', color: '#1B1A16' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', fontSize: 24, lineHeight: 1 }}>
                Jobocate<span style={{ color: '#1FA463' }}>.</span>
              </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div onMouseEnter={() => setMenu('product')} style={{ position: 'relative' }}>
                <button style={triggerBtn('product')}>
                  Product <span style={arrowStyle('product')}>▼</span>
                </button>
              </div>
              <div onMouseEnter={() => setMenu('solutions')} style={{ position: 'relative' }}>
                <button style={triggerBtn('solutions')}>
                  Solutions <span style={arrowStyle('solutions')}>▼</span>
                </button>
              </div>
              <Link href={appRoute('For Employers.dc.html')} onMouseEnter={close} style={plainLink}>For employers</Link>
              <Link href={appRoute('Pricing.dc.html')} onMouseEnter={close} style={plainLink}>Pricing</Link>
              <div onMouseEnter={() => setMenu('resources')} style={{ position: 'relative' }}>
                <button style={triggerBtn('resources')}>
                  Resources <span style={arrowStyle('resources')}>▼</span>
                </button>
              </div>
              <Link href={appRoute('Enterprise.dc.html')} onMouseEnter={close} style={plainLink}>Enterprise</Link>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <Link href={appRoute('App Login.dc.html')} style={{ color: '#1B1A16', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
              <Link href={appRoute('App Dashboard.dc.html')} style={{ background: '#1B1A16', color: '#F7F3EA', fontSize: 14, fontWeight: 600, padding: '11px 18px', borderRadius: 999, textDecoration: 'none' }}>Start free</Link>
            </div>
          </nav>

          {/* FLYOUT: PRODUCT */}
          <div style={flyoutWrap('product')}>
            <div style={{ ...panelCardBase, maxWidth: 1060, margin: '0 16px', borderRadius: '0 0 18px 18px', display: 'grid', gridTemplateColumns: '1.55fr 1fr', overflow: 'hidden' }}>
              <div style={{ padding: '26px 28px' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 18 }}>The platform</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {PRODUCT_ITEMS.map((it) => (
                    <Link key={it.title} href={appRoute(it.dc)} className="jbnav-item" style={{ display: 'flex', gap: 14, padding: 13, borderRadius: 12, color: '#1B1A16', textDecoration: 'none' }}>
                      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: it.tint, color: it.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13 }}>{it.tag}</span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{it.title}</span>
                        <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.45, color: '#7A7367' }}>{it.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div style={{ background: '#15140F', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 0%, rgba(31,164,99,0.35), transparent 60%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 14 }}>Featured</div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 27, lineHeight: 1.1, color: '#FBF8F1', marginBottom: 10 }}>Auto-Apply, now with verified-page targeting</div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: '#B8B1A4', margin: 0 }}>We apply directly to real company career pages on your behalf — never scam boards.</p>
                </div>
                <Link href={appRoute('Auto-Apply.dc.html')} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#5BD08C', fontSize: 14, fontWeight: 600, marginTop: 22, textDecoration: 'none' }}>Explore Auto-Apply →</Link>
              </div>
            </div>
          </div>

          {/* FLYOUT: SOLUTIONS */}
          <div style={flyoutWrap('solutions')}>
            <div style={{ ...panelCardBase, maxWidth: 760, margin: '0 16px', borderRadius: '0 0 18px 18px', padding: '26px 28px' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 18 }}>By who you are</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SOLUTION_ITEMS.map((it) => (
                  <a key={it.title} href="#" className="jbnav-item" style={{ display: 'flex', gap: 14, padding: 13, borderRadius: 12, color: '#1B1A16', textDecoration: 'none' }}>
                    <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13 }}>{it.tag}</span>
                    <span>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{it.title}</span>
                      <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.45, color: '#7A7367' }}>{it.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* FLYOUT: RESOURCES */}
          <div style={flyoutWrap('resources')}>
            <div style={{ ...panelCardBase, maxWidth: 620, margin: '0 16px', borderRadius: '0 0 18px 18px', padding: '24px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {RESOURCE_ITEMS.map((it) => (
                  <a key={it.title} href="#" className="jbnav-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, color: '#1B1A16', textDecoration: 'none' }}>
                    <span style={{ width: 8, height: 8, background: '#1FA463', flexShrink: 0 }} />
                    <span>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{it.title}</span>
                      <span style={{ display: 'block', fontSize: 12, color: '#7A7367' }}>{it.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
