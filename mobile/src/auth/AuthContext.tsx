import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_STORAGE_KEY } from '../config';
import { setAuthToken } from '../api/client';
import * as api from '../api/endpoints';
import type { User } from '../api/endpoints';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const normalizeProfile = (res: { user?: User } & User): User =>
  (res && res.user ? res.user : (res as User)) ?? null;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((next: string | null) => {
    setAuthToken(next);
    setToken(next);
  }, []);

  // On mount: restore token from secure storage and fetch the profile.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        if (stored) {
          applyToken(stored);
          try {
            const profile = await api.getProfile();
            if (active) setUser(normalizeProfile(profile));
          } catch {
            // Stale/invalid token — clear it so we land on the auth stack.
            await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
            if (active) applyToken(null);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyToken]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token: newToken } = await api.login(email, password);
      if (!newToken) throw new Error('Login did not return a token');
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, newToken);
      applyToken(newToken);
      const profile = await api.getProfile();
      setUser(normalizeProfile(profile));
    },
    [applyToken],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await api.register(name, email, password);
      await signIn(email, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  const value = useMemo<AuthState>(
    () => ({ token, user, loading, signIn, signUp, signOut }),
    [token, user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
