import "@/styles/globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from 'next-themes';
import ThemeProviderWrapper from '@/components/theme/ThemeProviderWrapper';
import Head from 'next/head';
import { Instrument_Serif, Public_Sans, IBM_Plex_Mono } from 'next/font/google';

/*
 * ============================================================================
 * THE ONLY PLACE FONTS ARE LOADED IN THIS APP.
 * ============================================================================
 * next/font self-hosts these files from our own origin, so there is no
 * third-party font request anywhere in the app and no @import url(...) that
 * the CSS bundler can silently drop (Turbopack keeps only the first one).
 *
 * To swap a face (e.g. Hanken Grotesk -> Montserrat) change ONE import + ONE
 * loader call below. Nothing else in the codebase names a font family; every
 * consumer goes through the --jb-font-* tokens in src/styles/tokens.css.
 *
 * Chain: next/font -> --jb-face-* (here) -> --jb-font-* (tokens.css)
 *        -> @theme --font-* (globals.css) -> `font-sans` etc. utilities.
 * ============================================================================
 */

// Display / headings. Instrument Serif ships weight 400 only (roman + italic).
const fontDisplay = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

// Body / UI sans. <-- SWAP THIS ONE LINE TO CHANGE THE SANS FACE.
const fontSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

// Mono. Eyebrows, metrics, timestamps, code.
const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem={true}
      storageKey="jobocate-theme"
      disableTransitionOnChange={false}
    >
      <ThemeProviderWrapper>
        {/* Publish the self-hosted families as CSS variables on :root so that
            every token in tokens.css and every `font-*` Tailwind utility
            resolves to them. Documented next/font pattern for the Pages
            Router — avoids adding a wrapper element to the DOM. */}
        <style jsx global>{`
          :root {
            --jb-face-display: ${fontDisplay.style.fontFamily};
            --jb-face-sans: ${fontSans.style.fontFamily};
            --jb-face-mono: ${fontMono.style.fontFamily};
          }
        `}</style>
        <AuthProvider>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="description" content="Jobocate - Find your dream job today" />
          </Head>
          <Component {...pageProps} />
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </AuthProvider>
      </ThemeProviderWrapper>
    </ThemeProvider>
  );
}
