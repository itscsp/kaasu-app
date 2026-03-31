import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  loadCredentials,
  saveCredentials,
  clearAll,
  hasPinSetup,
  encryptCredentials,
  decryptCredentials,
  clearPin,
} from '../lib/auth';
import { googleSignIn } from '../api';

// ─── Auth State Machine ───────────────────────────────────────────────────────
// Mirrors the web app's auth flow exactly.

export type AuthState =
  | 'loading'       // checking stored credentials
  | 'credentials'   // no credentials → show login
  | 'register'      // show registration form
  | 'forgot-password' // show forgot password form
  | 'pin-setup'     // credentials valid, no PIN yet → ask user to set PIN
  | 'pin-entry'     // PIN exists → ask for PIN to unlock
  | 'home';         // fully authenticated

interface PendingCreds {
  encoded: string; // base64 "user:pass"
}

interface AuthContextValue {
  authState: AuthState;
  credentials: string | null;  // active base64 credentials (set after PIN success)
  isLoading: boolean;

  // Transitions
  goToRegister: () => void;
  goToForgotPassword: () => void;
  goToLogin: () => void;

  /** Called after successful credential validation in LoginScreen */
  handleCredentialLogin: (encoded: string) => Promise<void>;

  /** Called after successful Google Sign-In — verifies with backend then proceeds to PIN setup */
  handleGoogleLogin: (idToken: string) => Promise<void>;

  /** Called after user sets a PIN on PinSetupScreen */
  handlePinSetupComplete: (pin: string) => Promise<void>;

  /** Called after user successfully enters correct PIN on PinEntryScreen */
  handlePinSuccess: (encoded: string) => void;

  /** Called when user taps "Forgot PIN" on PinEntryScreen */
  handleForgotPin: () => void;

  /** Full logout — clears all storage */
  logout: () => Promise<void>;

  pendingCreds: PendingCreds | null;
  googleLoading: boolean;
  googleError: string;
}

const AuthContext = createContext<AuthContextValue>({
  authState: 'loading',
  credentials: null,
  isLoading: true,
  goToRegister: () => {},
  goToForgotPassword: () => {},
  goToLogin: () => {},
  handleCredentialLogin: async () => {},
  handleGoogleLogin: async () => {},
  handlePinSetupComplete: async () => {},
  handlePinSuccess: () => {},
  handleForgotPin: () => {},
  logout: async () => {},
  pendingCreds: null,
  googleLoading: false,
  googleError: '',
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [credentials, setCredentials] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCreds, setPendingCreds] = useState<PendingCreds | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // On mount, determine initial auth state
  useEffect(() => {
    (async () => {
      try {
        const pinExists = await hasPinSetup();
        if (pinExists) {
          setAuthState('pin-entry');
        } else {
          const stored = await loadCredentials();
          if (stored) {
            // Credentials without PIN (edge case) — ask to set PIN
            setPendingCreds({ encoded: stored });
            setAuthState('pin-setup');
          } else {
            setAuthState('credentials');
          }
        }
      } catch {
        setAuthState('credentials');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Navigation helpers ──

  const goToRegister = () => setAuthState('register');
  const goToForgotPassword = () => setAuthState('forgot-password');
  const goToLogin = () => setAuthState('credentials');

  // ── Auth flow handlers ──

  /**
   * Called after LoginScreen validates credentials.
   * Saves credentials and moves to PIN setup.
   */
  const handleCredentialLogin = async (encoded: string) => {
    // If a PIN was already set (user is re-authenticating with creds), clear the old PIN
    const pinExists = await hasPinSetup();
    if (pinExists) await clearPin();

    await saveCredentials(encoded);
    setPendingCreds({ encoded });
    setAuthState('pin-setup');
  };

  /**
   * Called after LoginScreen receives a Google ID token.
   * Verifies token with backend → stores token → proceeds to PIN setup.
   */
  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await googleSignIn(idToken);
      if (!res.success) {
        setGoogleError('Google sign-in failed. Please try again.');
        return;
      }
      // Use the Google ID token directly as credentials (Bearer auth)
      const pinExists = await hasPinSetup();
      if (pinExists) await clearPin();
      await saveCredentials(idToken);
      setPendingCreds({ encoded: idToken });
      setAuthState('pin-setup');
    } catch (e: any) {
      setGoogleError(e?.message ?? 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * Called after PinSetupScreen — encrypts (stores) credentials with PIN.
   */
  const handlePinSetupComplete = async (pin: string) => {
    if (!pendingCreds) return;
    await encryptCredentials(pin, pendingCreds.encoded);
    setCredentials(pendingCreds.encoded);
    setPendingCreds(null);
    setAuthState('home');
  };

  /**
   * Called after PinEntryScreen successfully verifies PIN.
   * `encoded` is the decrypted credential string returned from decryptCredentials.
   */
  const handlePinSuccess = (encoded: string) => {
    setCredentials(encoded);
    setAuthState('home');
  };

  /**
   * User forgot PIN → go back to credential screen to re-authenticate.
   * Does NOT clear PIN yet (that happens on the next successful credential login).
   */
  const handleForgotPin = () => {
    setAuthState('credentials');
  };

  /**
   * Full logout — clears credentials and PIN from secure storage.
   * After logout, user must log in with credentials again.
   */
  const logout = async () => {
    await clearAll();
    setCredentials(null);
    setPendingCreds(null);
    setAuthState('credentials');
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        credentials,
        isLoading,
        goToRegister,
        goToForgotPassword,
        goToLogin,
        handleCredentialLogin,
        handleGoogleLogin,
        handlePinSetupComplete,
        handlePinSuccess,
        handleForgotPin,
        logout,
        pendingCreds,
        googleLoading,
        googleError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
