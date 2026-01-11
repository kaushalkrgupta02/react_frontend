import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { translations, Language, TranslationKey, getTranslation } from '@/i18n/translations';

const STORAGE_KEY = 'app_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function isTestMode(): boolean {
  return sessionStorage.getItem('testModeAuth') === 'true';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'en' || stored === 'id') ? stored : 'en';
  });

  // Load language from profile when user logs in
  useEffect(() => {
    if (!user || isTestMode()) return;

    const loadLanguageFromProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.language) {
        const lang = data.language as Language;
        if (lang === 'en' || lang === 'id') {
          setLanguageState(lang);
          localStorage.setItem(STORAGE_KEY, lang);
        }
      }
    };

    loadLanguageFromProfile();
  }, [user]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    // Save to profile if authenticated and not in test mode
    if (user && !isTestMode()) {
      await supabase
        .from('profiles')
        .update({ language: lang })
        .eq('user_id', user.id);
    }
  }, [user]);

  const t = useCallback((key: TranslationKey): string => {
    return getTranslation(language, key);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}