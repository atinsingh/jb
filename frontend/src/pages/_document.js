import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#fa5252" />
        
        {/* Preconnect to font providers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        
        {/* Plus Jakarta Sans - Primary font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
        
        {/* Clash Display - Display/Heading font */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
        
        {/* JetBrains Mono - Monospace font */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="antialiased" suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
