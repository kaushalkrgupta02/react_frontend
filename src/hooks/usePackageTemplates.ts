import { useState, useEffect } from 'react';
import { PackageItemType, RedemptionRule } from './usePackageItems';
import { PackageType } from './useVenuePackages';

export interface PackageTemplateItem {
  item_type: PackageItemType;
  item_name: string;
  quantity: number;
  redemption_rule: RedemptionRule;
}

export interface PackageTemplate {
  id: string;
  name: string;
  packageName: string;
  description: string;
  price: number;
  packageType: PackageType;
  items: PackageTemplateItem[];
  icon: string;
  isDefault?: boolean;
}

const DEFAULT_PACKAGE_TEMPLATES: PackageTemplate[] = [
  {
    id: 'vip-table',
    name: 'VIP Table',
    packageName: 'VIP Table Experience',
    description: 'Premium table reservation with dedicated service, 1 bottle of premium spirit, and mixers for up to 6 guests.',
    price: 2500000,
    packageType: 'bottle',
    items: [
      { item_type: 'experience', item_name: 'VIP Table Reservation', quantity: 1, redemption_rule: 'once' },
      { item_type: 'drink', item_name: 'Premium Spirit Bottle', quantity: 1, redemption_rule: 'once' },
      { item_type: 'drink', item_name: 'Mixers & Ice', quantity: 1, redemption_rule: 'unlimited' },
    ],
    icon: '👑',
    isDefault: true,
  },
  {
    id: 'bottle-service',
    name: 'Bottle Service',
    packageName: 'Bottle Service Gold',
    description: 'Premium bottle service package with 2 bottles of your choice, VIP entrance, and dedicated host.',
    price: 3500000,
    packageType: 'bottle',
    items: [
      { item_type: 'drink', item_name: 'Premium Bottle', quantity: 2, redemption_rule: 'once' },
      { item_type: 'entry', item_name: 'VIP Entry (Skip Line)', quantity: 4, redemption_rule: 'once' },
      { item_type: 'drink', item_name: 'Mixers & Ice', quantity: 1, redemption_rule: 'unlimited' },
    ],
    icon: '🍾',
    isDefault: true,
  },
  {
    id: 'event-pack',
    name: 'Event Pack',
    packageName: 'Event Party Pack',
    description: 'Perfect for special occasions! Includes decorated table, birthday cake, 1 bottle, and photo session.',
    price: 1800000,
    packageType: 'event',
    items: [
      { item_type: 'experience', item_name: 'Decorated Table', quantity: 1, redemption_rule: 'once' },
      { item_type: 'food', item_name: 'Birthday Cake', quantity: 1, redemption_rule: 'once' },
      { item_type: 'drink', item_name: 'Celebration Bottle', quantity: 1, redemption_rule: 'once' },
      { item_type: 'other', item_name: 'Photo Session', quantity: 1, redemption_rule: 'once' },
    ],
    icon: '🎉',
    isDefault: true,
  },
  {
    id: 'group-dining',
    name: 'Group Dining',
    packageName: 'Group Dinner Experience',
    description: 'Complete dining experience for groups with set menu, welcome drinks, and dessert.',
    price: 1200000,
    packageType: 'food',
    items: [
      { item_type: 'food', item_name: 'Set Menu (per person)', quantity: 6, redemption_rule: 'once' },
      { item_type: 'drink', item_name: 'Welcome Drinks', quantity: 6, redemption_rule: 'once' },
      { item_type: 'food', item_name: 'Dessert Platter', quantity: 1, redemption_rule: 'once' },
    ],
    icon: '🍽️',
    isDefault: true,
  },
];

const STORAGE_KEY = 'package-templates';

export function usePackageTemplates() {
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const custom = JSON.parse(stored) as PackageTemplate[];
        setTemplates([...DEFAULT_PACKAGE_TEMPLATES, ...custom]);
      } else {
        setTemplates(DEFAULT_PACKAGE_TEMPLATES);
      }
    } catch {
      setTemplates(DEFAULT_PACKAGE_TEMPLATES);
    }
    setIsLoading(false);
  };

  const saveTemplate = (template: Omit<PackageTemplate, 'id' | 'isDefault'>) => {
    const newTemplate: PackageTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      isDefault: false,
    };
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const custom = stored ? JSON.parse(stored) : [];
      custom.push(newTemplate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
      setTemplates([...DEFAULT_PACKAGE_TEMPLATES, ...custom]);
      return newTemplate;
    } catch {
      return null;
    }
  };

  const updateTemplate = (id: string, updates: Partial<PackageTemplate>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const custom = stored ? JSON.parse(stored) as PackageTemplate[] : [];
      const index = custom.findIndex(t => t.id === id);
      
      if (index !== -1) {
        custom[index] = { ...custom[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
        setTemplates([...DEFAULT_PACKAGE_TEMPLATES, ...custom]);
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
      const custom = stored ? JSON.parse(stored) as PackageTemplate[] : [];
      const filtered = custom.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setTemplates([...DEFAULT_PACKAGE_TEMPLATES, ...filtered]);
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
