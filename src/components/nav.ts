import { LayoutGrid, Search, Plus, SlidersHorizontal, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Browse', icon: LayoutGrid },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/add', label: 'Add Card', icon: Plus },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: '/presets', label: 'Presets', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
];
