import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Test user for preview mode
const TEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  phone: '+6281234567890',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithEmailOtp: (email: string, redirectTo: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo: string) => Promise<{ error: Error | null }>;
  signInWithApple: (redirectTo: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  testLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for test mode session first
    const testSession = sessionStorage.getItem('testModeAuth');
    if (testSession === 'true') {
      setUser(TEST_USER);
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error: error as Error | null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error: error as Error | null };
  };

  const signInWithEmailOtp = async (email: string, redirectTo: string) => {
    sessionStorage.removeItem('testModeAuth');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    return { error: error as Error | null };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { error: error as Error | null };
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    sessionStorage.removeItem('testModeAuth');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    sessionStorage.removeItem('testModeAuth');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectTo: string) => {
    sessionStorage.removeItem('testModeAuth');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error as Error | null };
  };

  const signInWithApple = async (redirectTo: string) => {
    sessionStorage.removeItem('testModeAuth');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    });
    return { error: error as Error | null };
  };

  const testLogin = () => {
    sessionStorage.setItem('testModeAuth', 'true');
    setUser(TEST_USER);
  };

  const signOut = async () => {
    sessionStorage.removeItem('testModeAuth');
    setUser(null);
    setSession(null);
    // Ignore errors - session may already be invalidated server-side
    try {
      await supabase.auth.signOut();
    } catch {
      // Session was already invalidated, clear local storage manually
      localStorage.removeItem('sb-swsogxafillkpayibzrw-auth-token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithPhone,
        verifyOtp,
        signInWithEmailOtp,
        verifyEmailOtp,
        signUpWithEmailPassword,
        signInWithEmailPassword,
        signInWithGoogle,
        signInWithApple,
        signOut,
        testLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
