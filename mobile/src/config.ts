import Constants from 'expo-constants';

/**
 * API base URL.
 *
 * IMPORTANT: On a physical phone (Expo Go) `localhost` points at the phone
 * itself, not your dev machine — so the base URL MUST be your machine's LAN IP
 * (e.g. `http://192.168.x.x:8000/api`). Change `extra.apiBaseUrl` in app.json
 * (or via an env-injected config) to match the machine running the backend.
 *
 * React Native's native `fetch` has NO CORS restriction, so no CORS setup is
 * needed on the backend for the app to talk to it.
 */
const DEFAULT_API_BASE_URL = 'http://10.0.0.126:8000/api';

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  DEFAULT_API_BASE_URL;

export const TOKEN_STORAGE_KEY = 'jobocate_token';
