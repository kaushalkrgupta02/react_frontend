import { useState, useEffect } from 'react';

export interface PromoTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  promoType: 'bogo' | 'percentage' | 'free_item' | 'bundle' | 'fixed';
  discountValue: number;
  targetAudience: string;
  bestTiming: string;
  icon: string;
  isDefault?: boolean;
}

const DEFAULT_PROMO_TEMPLATES: PromoTemplate[] = [
  {
    id: 'happy-hour',
    name: 'Happy Hour BOGO',
    title: 'Happy Hour BOGO',
    description: 'Buy one get one free on all cocktails during happy hour',
    promoType: 'bogo',
    discountValue: 50,
    targetAudience: 'After-work crowd, couples',
    bestTiming: 'Tuesday & Wednesday, 6-8 PM',
    icon: '🍸',
    isDefault: true,
  },
  {
    id: 'ladies-night',
    name: 'Ladies Night',
    title: 'Ladies Night 50% Off',
    description: '50% off all drinks for ladies',
    promoType: 'percentage',
    discountValue: 50,
    targetAudience: 'Female groups, party-goers',
    bestTiming: 'Thursday, 9 PM onwards',
    icon: '👑',
    isDefault: true,
  },
  {
    id: 'first-timer',
    name: 'First Timer Welcome',
    title: 'Welcome Shot',
    description: 'Free welcome shot for first-time visitors',
    promoType: 'free_item',
    discountValue: 0,
    targetAudience: 'New customers',
    bestTiming: 'All week',
    icon: '🎁',
    isDefault: true,
  },
  {
    id: 'weekend-bundle',
    name: 'Weekend Bundle',
    title: 'Weekend Party Bundle',
    description: 'Bottle + table reservation at special price',
    promoType: 'bundle',
    discountValue: 20,
    targetAudience: 'Groups, weekend party-goers',
    bestTiming: 'Friday & Saturday nights',
    icon: '🎉',
    isDefault: true,
  },
];

const STORAGE_KEY = 'promo-templates';

export function usePromoTemplates() {
  const [templates, setTemplates] = useState<PromoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const custom = JSON.parse(stored) as PromoTemplate[];
        setTemplates([...DEFAULT_PROMO_TEMPLATES, ...custom]);
      } else {
        setTemplates(DEFAULT_PROMO_TEMPLATES);
      }
    } catch {
      setTemplates(DEFAULT_PROMO_TEMPLATES);
    }
    setIsLoading(false);
  };

  const saveTemplate = (template: Omit<PromoTemplate, 'id' | 'isDefault'>) => {
    const newTemplate: PromoTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      isDefault: false,
    };
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const custom = stored ? JSON.parse(stored) : [];
      custom.push(newTemplate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
      setTemplates([...DEFAULT_PROMO_TEMPLATES, ...custom]);
      return newTemplate;
    } catch {
      return null;
    }
  };

  const updateTemplate = (id: string, updates: Partial<PromoTemplate>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const custom = stored ? JSON.parse(stored) as PromoTemplate[] : [];
      const index = custom.findIndex(t => t.id === id);
      
      if (index !== -1) {
        custom[index] = { ...custom[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
        setTemplates([...DEFAULT_PROMO_TEMPLATES, ...custom]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteTemplate = (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const custom = stored ? JSON.parse(stored) as PromoTemplate[] : [];
      const filtered = custom.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setTemplates([...DEFAULT_PROMO_TEMPLATES, ...filtered]);
      return true;
    } catch {
      return false;
    }
  };

  const defaultTemplates = templates.filter(t => t.isDefault);
  const customTemplates = templates.filter(t => !t.isDefault);

  return {
    templates,
    defaultTemplates,
    customTemplates,
    isLoading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    reload: loadTemplates,
  };
}
