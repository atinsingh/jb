'use client';

import Head from 'next/head';
import AdminSidebar from '@/components/admin/AdminSidebar';

/*
 * Shared page frame for the admin operator console: fonts, the light slate
 * content surface, the AdminSidebar rail, and a sticky header with a mono
 * breadcrumb plus an optional actions slot. Page bodies render as children.
 */
export default function AdminShell({ active, title, crumb, actions = null, children }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} — Jobocate Admin` : 'Jobocate Admin'}</title>
      </Head>

      <style jsx global>{`
        #adapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #adapp ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
      `}</style>

      <div
        id="adapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F1F5F9',
          fontFamily: 'var(--jb-font-sans)',
          color: '#0F172A',
        }}
      >
        <AdminSidebar active={active} />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(241,245,249,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#64748B',
              }}
            >
              {crumb || 'Admin'}
            </div>
            <div style={{ flex: 1 }} />
            {actions}
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
