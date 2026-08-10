'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/brand/Logo';
import useMarketingTheme from './useMarketingTheme';

/**
 * Marketing header — the single public nav for every page on the public site.
 *
 * Two things changed in the unification pass:
 *
 * 1. The IA is now public-only. The previous version shipped 15 flyout links,
 *    five of which pointed at gated /employer/* screens and two at gated
 *    /app/* screens — a logged-out visitor clicking them landed on a login
 *    wall. The employer flyout is gone entirely; "For Employers" is now a flat
 *    link to the public /employers page, which is the actual funnel entry.
 *    Every remaining destination is a public marketing route.
 *
 * 2. It is auth-aware. It previously always rendered "Sign in", even to a
 *    signed-in user, and had no route home. The auth zone now resolves the
 *    signed-in user's role to their own surface.
 *
 * Retained from the previous build: click AND hover opening, Escape-to-close
 * with focus restore, aria-expanded/aria-controls wiring, outside-click
 * dismiss, body scroll lock, and a real mobile drawer.
 *
 * `variant="employer"` (used by /employers and /employers/pricing) promotes the
 * hiring CTA to primary; the candidate CTA stays visible either way.
 */

const PRODUCT_ITEMS = [
  { icon: 'match', title: 'Job Matching', desc: 'Ranked on skills, eligibility and availability.', dc: 'Job Matching.dc.html' },
  { icon: 'send', title: 'Auto-Apply', desc: 'Apply on your terms, with limits you set.', dc: 'Auto-Apply.dc.html' },
  { icon: 'doc', title: 'Resume Builder', desc: 'Tailored, ATS-ready resumes.', dc: 'Resume Builder.dc.html' },
  { icon: 'letter', title: 'Cover Letters', desc: 'Written from your real experience.', dc: 'Cover Letters.dc.html' },
  { icon: 'mic', title: 'Interview Prep', desc: 'Practise with AI and get specific feedback.', dc: 'Interview Prep.dc.html' },
];

const RESOURCE_ITEMS = [
  { icon: 'blog', title: 'Blog', desc: 'Job-search playbooks', dc: 'Blog.dc.html' },
  // 'Customer stories' removed with /customers — see retiredMarketingRedirects
  // in next.config.js. Restore both together once real stories exist.
  { icon: 'demo', title: 'Book a demo', desc: 'Walk through it with us', dc: 'Book Demo.dc.html' },
  { icon: 'about', title: 'About', desc: 'Who we are and why', dc: 'About.dc.html' },
  { icon: 'chat', title: 'Contact', desc: 'Talk to a human', href: '/contact' },
  { icon: 'shield', title: 'Security', desc: 'How we protect your data', dc: 'Security.dc.html' },
  { icon: 'building', title: 'Enterprise', desc: 'For larger hiring teams', dc: 'Enterprise.dc.html' },
];

// A signed-in visitor gets one destination: their own surface. Keep in sync
// with the role gate in AuthContext.
const ROLE_HOME = {
  ROLE_CANDIDATE: { label: 'Dashboard', href: '/app/dashboard' },
  ROLE_EMPLOYER: { label: 'Hiring dashboard', href: '/employer/dashboard' },
  ROLE_AGENT: { label: 'Agent console', href: '/agent/dashboard' },
  ROLE_ADMIN: { label: 'Admin', href: '/admin/dashboard' },
};

const hrefFor = (item) => item.href || appRoute(item.dc);

/**
 * Flyout icons.
 *
 * These replaced two-letter monogram tags (JM / AA / RB / CL / IP), which read
 * as an abbreviation the visitor had to decode before the label next to it.
 * Line icons at 1.6 stroke sit better with the mono/serif pairing and stay
 * legible at 20px. Purely decorative — every item still carries its text label,
 * so the icons are aria-hidden.
 */
const ICONS = {
  // target — ranked matching
  match: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /><path d="M12 1.6v2.6M12 19.8v2.6M1.6 12h2.6M19.8 12h2.6" /></>,
  // paper plane — auto-apply / send
  send: <><path d="M21.4 2.6 10.8 13.2" /><path d="M21.4 2.6 14.6 21.6l-3.8-8.4-8.4-3.8Z" /></>,
  // document with lines — resume
  doc: <><path d="M14 2.8H6.6a1.8 1.8 0 0 0-1.8 1.8v14.8a1.8 1.8 0 0 0 1.8 1.8h10.8a1.8 1.8 0 0 0 1.8-1.8V7.8Z" /><path d="M14 2.8v5h5.2M8.6 13h6.8M8.6 17h4.4" /></>,
  // envelope with pen stroke — cover letters
  letter: <><path d="M3.4 6.4h17.2v11.2H3.4Z" /><path d="m3.4 6.8 8.6 6 8.6-6" /></>,
  // microphone — interview practice
  mic: <><rect x="9.2" y="2.4" width="5.6" height="11" rx="2.8" /><path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8v3.8" /></>,
  // pen on page — blog
  blog: <><path d="M4.4 19.6h15.2M6 16.4V12l7.6-7.6 4 4L10 16h-4Z" /></>,
  // play in a frame — demo
  demo: <><rect x="2.8" y="4.4" width="18.4" height="15.2" rx="2.4" /><path d="m10.4 9.6 4.8 3-4.8 3Z" /></>,
  // people — about
  about: <><circle cx="9" cy="8.4" r="3.4" /><path d="M2.8 20.2a6.2 6.2 0 0 1 12.4 0M16.4 5.4a3.4 3.4 0 0 1 0 6M18 20.2a6.2 6.2 0 0 0-2.2-4.8" /></>,
  // speech bubble — contact
  chat: <><path d="M20.6 12.6a7.4 7.4 0 0 1-8 7.4L4 21.4l1.4-6.2a7.4 7.4 0 1 1 15.2-2.6Z" /></>,
  // shield — security
  shield: <><path d="M12 2.6 4.6 5.8v6c0 4.6 3.1 8.8 7.4 10 4.3-1.2 7.4-5.4 7.4-10v-6Z" /><path d="m8.8 12 2.2 2.2 4.2-4.2" /></>,
  // building — enterprise
  building: <><path d="M4.4 21.4V4.6a1.8 1.8 0 0 1 1.8-1.8h7.6a1.8 1.8 0 0 1 1.8 1.8v16.8M15.6 9.6h2.2a1.8 1.8 0 0 1 1.8 1.8v10M8 7.4h4M8 11.4h4M8 15.4h4" /></>,
};

function NavIcon({ name }) {
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}

export default function SiteNav({ variant = 'candidate' }) {
  const [menu, setMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const mobileBtnRef = useRef(null);
  const hoverTimer = useRef(null);
  const uid = useId();
  const router = useRouter();
  const auth = useAuth();
  const { theme, toggle: toggleTheme } = useMarketingTheme();
  const user = auth?.user;

  const isEmployer = variant === 'employer';
  const home = user ? ROLE_HOME[user.role] || ROLE_HOME.ROLE_CANDIDATE : null;

  const jobsHref = appRoute('Browse Jobs.dc.html');
  const employersHref = appRoute('For Employers.dc.html');
  const pricingHref = appRoute('Pricing.dc.html');
  const signInHref = isEmployer ? '/app/login?as=employer' : appRoute('App Login.dc.html');
  const signUpHref = appRoute('App Sign Up.dc.html');

  // aria-current: the whole app previously had none, so no assistive tech could
  // tell which marketing page it was on. A section match (not just an exact
  // pathname match) so /jobs/[id] still marks "Find Jobs" as current.
  const path = router?.pathname || '';
  const inSection = (base) => path === base || path.startsWith(`${base}/`);
  const currentProps = (href) => {
    const base = href.split('?')[0];
    return inSection(base) ? { 'aria-current': 'page' } : {};
  };

  const close = useCallback(() => setMenu(null), []);

  // Escape closes whichever layer is open; focus returns to the trigger.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) {
        setMobileOpen(false);
        mobileBtnRef.current?.focus();
      } else if (menu) {
        const trigger = document.getElementById(`${uid}-trigger-${menu}`);
        close();
        trigger?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu, mobileOpen, close, uid]);

  // Clicking outside the header dismisses any open flyout.
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu, close]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const openOnHover = (name) => {
    clearTimeout(hoverTimer.current);
    setMenu(name);
  };
  const closeOnLeave = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(close, 120);
  };

  const trigger = (name, label) => {
    const expanded = menu === name;
    return (
      <div className="jbnav__slot" onMouseEnter={() => openOnHover(name)}>
        <button
          id={`${uid}-trigger-${name}`}
          type="button"
          className="jbnav__trigger"
          aria-expanded={expanded}
          aria-controls={`${uid}-panel-${name}`}
          onClick={() => setMenu(expanded ? null : name)}
        >
          {label}
          <svg className="jbnav__chev" width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  };

  const itemList = (items, tone) => (
    <ul className="jbnav__grid">
      {items.map((it) => {
        const href = hrefFor(it);
        return (
          <li key={it.title}>
            <Link href={href} className="jbnav__item" onClick={close} {...currentProps(href)}>
              <span className={`jbnav__tag jbnav__tag--${tone}`} aria-hidden="true">
                <NavIcon name={it.icon} />
              </span>
              <span className="jbnav__itemtext">
                <span className="jbnav__itemtitle">{it.title}</span>
                <span className="jbnav__itemdesc">{it.desc}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="jb" ref={navRef}>
      <a className="jb-skip" href="#main">
        Skip to content
      </a>

      <header className="jbnav" onMouseLeave={closeOnLeave}>
        <nav className="jbnav__bar" aria-label="Main">
          <Link href={appRoute('Jobocate Home.dc.html')} className="jbnav__logo" aria-label="Jobocate home">
            <Logo theme={theme === 'light' ? 'light' : 'dark'} size={26} />
          </Link>

          {/* ---- Desktop nav ---- */}
          <div className="jbnav__links">
            <Link href={jobsHref} className="jbnav__link" onMouseEnter={close} {...currentProps(jobsHref)}>
              Find Jobs
            </Link>
            {trigger('product', 'Product')}
            <Link
              href={employersHref}
              className="jbnav__link"
              onMouseEnter={close}
              {...currentProps(employersHref)}
            >
              For Employers
            </Link>
            <Link href={pricingHref} className="jbnav__link" onMouseEnter={close} {...currentProps(pricingHref)}>
              Pricing
            </Link>
            {trigger('resources', 'Resources')}
          </div>

          <div className="jbnav__actions">
            <button
              type="button"
              className="jbnav__theme"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.4v2.2M12 19.4v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.4 13.6A8.4 8.4 0 1 1 10.4 3.6a6.6 6.6 0 0 0 10 10Z" />
                </svg>
              )}
            </button>
            {home ? (
              <Link href={home.href} className="jbnav__cta jbnav__cta--ink">
                {home.label}
              </Link>
            ) : (
              <>
                <Link href={signInHref} className="jbnav__signin">
                  Sign in
                </Link>
                <Link
                  href={signUpHref}
                  className={`jbnav__cta ${isEmployer ? 'jbnav__cta--quiet' : 'jbnav__cta--ink'}`}
                >
                  Get started
                </Link>
                <Link
                  href={employersHref}
                  className={`jbnav__cta ${isEmployer ? 'jbnav__cta--employer' : 'jbnav__cta--outline'}`}
                >
                  Post a job
                </Link>
              </>
            )}
          </div>

          {/* ---- Mobile toggle ---- */}
          <button
            ref={mobileBtnRef}
            type="button"
            className="jbnav__burger"
            aria-expanded={mobileOpen}
            aria-controls={`${uid}-mobile`}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="jb-sr">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            <span className={`jbnav__burgerbox ${mobileOpen ? 'is-open' : ''}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </nav>

        {/* ---- Flyouts ---- */}
        <div
          id={`${uid}-panel-product`}
          className={`jbnav__flyout ${menu === 'product' ? 'is-open' : ''}`}
          hidden={menu !== 'product'}
          onMouseEnter={() => openOnHover('product')}
        >
          <div className="jbnav__panel">
            <p className="jbnav__panelhead">Product</p>
            {itemList(PRODUCT_ITEMS, 'green')}
            <Link href={jobsHref} className="jbnav__panelcta" onClick={close}>
              Browse open roles →
            </Link>
          </div>
        </div>

        <div
          id={`${uid}-panel-resources`}
          className={`jbnav__flyout ${menu === 'resources' ? 'is-open' : ''}`}
          hidden={menu !== 'resources'}
          onMouseEnter={() => openOnHover('resources')}
        >
          <div className="jbnav__panel jbnav__panel--narrow">
            <p className="jbnav__panelhead">Resources</p>
            {itemList(RESOURCE_ITEMS)}
          </div>
        </div>
      </header>

      {/* ---- Mobile drawer ---- */}
      <div id={`${uid}-mobile`} className={`jbnav__mobile ${mobileOpen ? 'is-open' : ''}`} hidden={!mobileOpen}>
        <div className="jbnav__mobileinner">
          <Link href={jobsHref} className="jbnav__mlink" onClick={closeMobile} {...currentProps(jobsHref)}>
            Find Jobs
          </Link>
          <Link href={employersHref} className="jbnav__mlink" onClick={closeMobile} {...currentProps(employersHref)}>
            For Employers
          </Link>
          <Link href={pricingHref} className="jbnav__mlink" onClick={closeMobile} {...currentProps(pricingHref)}>
            Pricing
          </Link>

          <p className="jbnav__msection">Product</p>
          {PRODUCT_ITEMS.map((it) => (
            <Link
              key={it.title}
              href={hrefFor(it)}
              className="jbnav__msub"
              onClick={closeMobile}
              {...currentProps(hrefFor(it))}
            >
              {it.title}
            </Link>
          ))}

          <p className="jbnav__msection">Resources</p>
          {RESOURCE_ITEMS.map((it) => (
            <Link
              key={it.title}
              href={hrefFor(it)}
              className="jbnav__msub"
              onClick={closeMobile}
              {...currentProps(hrefFor(it))}
            >
              {it.title}
            </Link>
          ))}

          <div className="jbnav__mactions">
            {home ? (
              <Link href={home.href} className="jbnav__mcta jbnav__mcta--ink" onClick={closeMobile}>
                {home.label}
              </Link>
            ) : (
              <>
                <Link href={signUpHref} className="jbnav__mcta jbnav__mcta--ink" onClick={closeMobile}>
                  Get started
                </Link>
                <Link href={employersHref} className="jbnav__mcta jbnav__mcta--employer" onClick={closeMobile}>
                  Post a job
                </Link>
                <Link href={signInHref} className="jbnav__msignin" onClick={closeMobile}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/*
        `global` is required, not stylistic: styled-jsx only attaches its scope
        class to lowercase host elements it renders directly. Most of this nav
        is <Link> (a custom component) or JSX returned from the trigger()/map
        helpers, none of which receive the scope — so a plain `<style jsx>`
        block silently fails to style them. Every selector here is prefixed
        `jbnav__`, so global scope cannot collide with the rest of the app.
      */}
      <style jsx global>{`
        .jbnav {
          position: sticky;
          top: 0;
          z-index: 60;
          /* The mock's nav sits transparent on the page gradient. It is sticky,
             though, so once content scrolls under it a translucent dark wash
             plus blur keeps the links legible without introducing a hard band. */
          background: var(--jb-nav-wash);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border-bottom: 1px solid var(--jb-d-line);
          font-family: var(--jb-font-sans);
          color: var(--jb-ink);
        }
        .jbnav__bar {
          max-width: var(--jb-maxw);
          margin: 0 auto;
          padding: 12px var(--jb-gutter);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--jb-space-6);
        }
        .jbnav__theme {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: transparent;
          border: 1px solid var(--jb-d-line-strong);
          color: var(--jb-d-ink-70);
          cursor: pointer;
          transition: color var(--jb-dur) var(--jb-ease), border-color var(--jb-dur) var(--jb-ease);
        }
        .jbnav__theme:hover {
          color: var(--jb-d-accent);
          border-color: var(--jb-d-accent);
        }
        .jbnav__logo {
          line-height: 1;
          color: var(--jb-ink);
          text-decoration: none;
          flex-shrink: 0;
        }
        .jbnav__logo span {
          color: var(--jb-accent-text);
        }

        .jbnav__links {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .jbnav__slot {
          position: relative;
        }
        /* 15px -> 16px and #46413A -> --jb-ink-body: the old links were both
           too small and too low-contrast to scan. */
        .jbnav__link,
        .jbnav__trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink-body);
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px 12px;
          border-radius: var(--jb-radius-sm);
          text-decoration: none;
          white-space: nowrap;
          min-height: 44px;
          transition: color var(--jb-dur) var(--jb-ease), background-color var(--jb-dur) var(--jb-ease);
        }
        .jbnav__link:hover,
        .jbnav__trigger:hover,
        .jbnav__trigger[aria-expanded='true'] {
          color: var(--jb-ink);
          background: rgba(242, 236, 219, 0.08);
        }
        /* Current page: a visible marker, not colour alone — the aria-current
           attribute is the single source of truth for both. */
        .jbnav__link[aria-current='page'] {
          color: var(--jb-ink);
          box-shadow: inset 0 -2px 0 var(--jb-accent);
        }
        .jbnav__chev {
          color: var(--jb-accent-text);
          transition: transform var(--jb-dur) var(--jb-ease);
        }
        .jbnav__trigger[aria-expanded='true'] .jbnav__chev {
          transform: rotate(180deg);
        }

        .jbnav__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .jbnav__signin {
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink);
          text-decoration: none;
          padding: 10px 6px;
          border-radius: var(--jb-radius-sm);
        }
        .jbnav__signin:hover {
          text-decoration: underline;
        }
        .jbnav__cta {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 11px 18px;
          border-radius: var(--jb-radius-pill);
          font-size: var(--jb-text-sm);
          font-weight: 700;
          text-decoration: none;
          border: 1px solid transparent;
          white-space: nowrap;
          transition: background-color var(--jb-dur) var(--jb-ease), border-color var(--jb-dur) var(--jb-ease);
        }
        .jbnav__cta--ink {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .jbnav__cta--ink:hover {
          background: #fff;
        }
        .jbnav__cta--outline {
          background: transparent;
          color: var(--jb-employer-text);
          border-color: rgba(124, 196, 255, 0.45);
        }
        .jbnav__cta--outline:hover {
          background: var(--jb-employer-tint);
          border-color: var(--jb-employer-text);
        }
        .jbnav__cta--employer {
          background: var(--jb-employer);
          color: var(--jb-d-bg);
        }
        .jbnav__cta--employer:hover {
          background: var(--jb-employer-text);
        }
        .jbnav__cta--quiet {
          background: transparent;
          color: var(--jb-ink);
          border-color: var(--jb-border-strong);
        }
        .jbnav__cta--quiet:hover {
          border-color: var(--jb-ink);
        }

        .jbnav__burger {
          display: none;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          background: none;
          border: 1px solid var(--jb-border-strong);
          border-radius: var(--jb-radius-sm);
          cursor: pointer;
        }
        .jbnav__burgerbox {
          display: block;
          width: 18px;
          height: 12px;
          position: relative;
        }
        .jbnav__burgerbox span {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--jb-ink);
          border-radius: 2px;
          transition: transform var(--jb-dur) var(--jb-ease), opacity var(--jb-dur) var(--jb-ease);
        }
        .jbnav__burgerbox span:nth-child(1) {
          top: 0;
        }
        .jbnav__burgerbox span:nth-child(2) {
          top: 5px;
        }
        .jbnav__burgerbox span:nth-child(3) {
          top: 10px;
        }
        .jbnav__burgerbox.is-open span:nth-child(1) {
          transform: translateY(5px) rotate(45deg);
        }
        .jbnav__burgerbox.is-open span:nth-child(2) {
          opacity: 0;
        }
        .jbnav__burgerbox.is-open span:nth-child(3) {
          transform: translateY(-5px) rotate(-45deg);
        }

        .jbnav__flyout {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 var(--jb-gutter);
        }
        .jbnav__flyout.is-open {
          animation: jbfly var(--jb-dur) var(--jb-ease) both;
        }
        @keyframes jbfly {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .jbnav__panel {
          width: 100%;
          max-width: 760px;
          /* Opaque, not glass. The dark surface's panel token is 55% alpha,
             which let the hero headline read straight through the flyout and
             made the menu items hard to pick out. A dropdown that overlaps
             content needs to occlude it, so this is a solid surface lifted
             just above the page gradient, carried by the shadow instead. */
          background: var(--jb-surface-raised);
          border: 1px solid var(--jb-d-line-strong);
          border-top: none;
          border-radius: 0 0 var(--jb-radius-lg) var(--jb-radius-lg);
          box-shadow: 0 28px 60px -20px rgba(0, 0, 0, 0.65);
          padding: var(--jb-space-6);
        }
        .jbnav__panel--narrow {
          max-width: 620px;
        }
        .jbnav__panelhead {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--jb-ink-subtle);
          margin: 0 0 var(--jb-space-4);
        }
        .jbnav__grid {
          display: grid;
          /* Two columns only when there is genuinely room. The fixed 1fr 1fr
             squeezed "Job Matching" onto three lines inside the mobile drawer. */
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: 4px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .jbnav__item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: var(--jb-radius);
          color: var(--jb-ink);
          text-decoration: none;
          transition: background-color var(--jb-dur) var(--jb-ease);
        }
        .jbnav__item:hover {
          background: var(--jb-surface-alt);
        }
        .jbnav__item[aria-current='page'] {
          background: var(--jb-surface-alt);
          box-shadow: inset 2px 0 0 var(--jb-accent);
        }
        /* Icon tile. Sized for a 20px line icon with even optical padding;
           the border keeps the tile readable on the flyout's solid surface
           without needing a heavy fill. */
        .jbnav__tag {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          transition: border-color var(--jb-dur) var(--jb-ease),
            background-color var(--jb-dur) var(--jb-ease);
        }
        .jbnav__item:hover .jbnav__tag {
          border-color: var(--jb-d-accent);
        }
        .jbnav__tag--green {
          background: var(--jb-tint-green);
          color: var(--jb-accent-text);
        }
        .jbnav__tag--blue {
          background: var(--jb-employer-tint);
          color: var(--jb-employer-text);
        }
        /* Was 8x8 with a background and no radius, so the "dot" rendered as a
           square. 50% makes it the dot it is named for. */
        .jbnav__dot {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          margin-top: 6px;
          border-radius: 50%;
          background: var(--jb-accent);
        }
        .jbnav__itemtext {
          display: block;
        }
        .jbnav__itemtitle {
          display: block;
          font-weight: 700;
          font-size: var(--jb-text-base);
          margin-bottom: 2px;
        }
        .jbnav__itemdesc {
          display: block;
          font-size: var(--jb-text-sm);
          line-height: 1.45;
          color: var(--jb-ink-muted);
        }
        .jbnav__panelcta {
          display: inline-block;
          margin-top: var(--jb-space-4);
          font-size: var(--jb-text-base);
          font-weight: 700;
          color: var(--jb-accent-text);
          text-decoration: none;
        }
        .jbnav__panelcta:hover {
          text-decoration: underline;
        }

        .jbnav__mobile {
          display: none;
        }
        .jbnav__mobileinner {
          padding: var(--jb-space-4) var(--jb-gutter) var(--jb-space-12);
        }
        .jbnav__mlink {
          display: block;
          padding: 14px 0;
          font-size: var(--jb-text-lg);
          font-weight: 700;
          color: var(--jb-ink);
          text-decoration: none;
          border-bottom: 1px solid var(--jb-border);
        }
        .jbnav__msection {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--jb-ink-subtle);
          margin: var(--jb-space-6) 0 var(--jb-space-2);
        }
        .jbnav__msub {
          display: block;
          padding: 12px 0;
          min-height: 44px;
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink-body);
          text-decoration: none;
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .jbnav__mlink[aria-current='page'],
        .jbnav__msub[aria-current='page'] {
          color: var(--jb-accent-text);
        }
        .jbnav__mactions {
          display: grid;
          gap: var(--jb-space-3);
          margin-top: var(--jb-space-8);
        }
        .jbnav__mcta {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          border-radius: var(--jb-radius-pill);
          font-size: var(--jb-text-base);
          font-weight: 700;
          text-decoration: none;
        }
        .jbnav__mcta--ink {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .jbnav__mcta--employer {
          background: var(--jb-employer);
          color: var(--jb-d-bg);
        }
        .jbnav__msignin {
          text-align: center;
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink);
          padding: 12px;
          text-decoration: underline;
        }

        /* Below 1080px the full desktop bar cannot fit; swap to the drawer. */
        @media (max-width: 1080px) {
          .jbnav__links,
          .jbnav__actions {
            display: none;
          }
          .jbnav__burger {
            display: inline-flex;
          }
          .jbnav__mobile {
            display: block;
            position: fixed;
            /* 61px was the old header height; the bar is 69px below 1080px,
               so the first link used to sit under the translucent header. */
            inset: 69px 0 0;
            z-index: 55;
            /* Opaque for the same reason as the desktop flyout — a full-screen
               drawer must occlude the page it covers. */
            background: var(--jb-surface-raised);
            overflow-y: auto;
            overscroll-behavior: contain;
          }
          .jbnav__mobile.is-open {
            animation: jbdrawer var(--jb-dur-slow) var(--jb-ease) both;
          }
          @keyframes jbdrawer {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        }
      `}</style>
    </div>
  );
}
