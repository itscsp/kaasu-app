import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDS_KEY = 'kaasu_credentials';

interface AuthContextValue {
  credentials: string | null; // base64-encoded "user:pass"
  isLoading: boolean;
  login: (encoded: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  credentials: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved credentials on mount
  useEffect(() => {
    AsyncStorage.getItem(CREDS_KEY)
      .then(stored => setCredentials(stored))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (encoded: string) => {
    await AsyncStorage.setItem(CREDS_KEY, encoded);
    setCredentials(encoded);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(CREDS_KEY);
    setCredentials(null);
  };

  return (
    <AuthContext.Provider value={{ credentials, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
