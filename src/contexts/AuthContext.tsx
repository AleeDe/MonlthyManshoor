import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  loading: boolean;
  writeToken: string | null;
  signIn: (password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'manshoor_admin_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [writeToken, setWriteToken] = useState<string | null>(
    () => sessionStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(false);

  const signIn = async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Login failed' };
      }
      sessionStorage.setItem(STORAGE_KEY, data.token);
      setWriteToken(data.token);
      return { error: null };
    } catch {
      return { error: 'Network error. Are you running the deployed site or vercel dev?' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setWriteToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAdmin: !!writeToken, loading, writeToken, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
