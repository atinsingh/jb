import "@/styles/globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from 'next-themes';
import ThemeProviderWrapper from '@/components/theme/ThemeProviderWrapper';
import Head from 'next/head';

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
