import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Marketing theme bootstrap.
 *
 * Runs before first paint so the surface never flashes the wrong theme. It is
 * deliberately separate from next-themes: that provider is global and drives
 * the signed-in app, which is cream-designed and must not follow the marketing
 * toggle. Marketing owns `data-jb-theme` and defaults to dark, because dark is
 * the design — light is opt-in.
 */
const THEME_INIT = `
(function(){
  try {
    var stored = localStorage.getItem('jobocate-marketing-theme');
    document.documentElement.setAttribute(
      'data-jb-theme',
      stored === 'light' ? 'light' : 'dark'
    );
  } catch (e) {
    document.documentElement.setAttribute('data-jb-theme', 'dark');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en" data-jb-theme="dark" suppressHydrationWarning>
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0d2418" />

        {/* No font <link>s and no font preconnects here on purpose. Fonts are
            self-hosted by next/font in src/pages/_app.js, so there is no
            third-party font origin to connect to. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </Head>
      <body className="antialiased" suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
