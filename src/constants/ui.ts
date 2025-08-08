// src/constants/ui.ts

// Alert & Notification Constants
export const ALERT_AUTO_DISMISS_TIMEOUT = 5000; // 5 seconds

// Pagination Constants
export const DEFAULT_ITEMS_PER_PAGE = 25;
export const MAX_VISIBLE_PAGES = 7;

// Icon Size Constants (following CeleroPress Design System)
export const ICON_SIZES = {
  xs: 'h-3 w-3', // 12px - für sehr kleine UI-Elemente
  sm: 'h-4 w-4', // 16px - Standard für Buttons, kleine UI
  md: 'h-5 w-5', // 20px - Navigation, mittlere UI-Elemente
  lg: 'h-6 w-6', // 24px - größere UI-Bereiche, Hero-Sections
  xl: 'h-8 w-8', // 32px - nur für große Hero-Bereiche
  '2xl': 'h-12 w-12', // 48px - Loading-Spinner, große Platzhalter
} as const;

// Primary Colors (CeleroPress Design System)
export const PRIMARY_COLORS = {
  primary: '#005fab',
  primaryHover: '#004a8c',
  primaryFocus: '#005fab',
} as const;

// Loading Spinner Constants
export const LOADING_SPINNER_SIZE = ICON_SIZES['2xl'];
export const LOADING_SPINNER_BORDER = 'border-b-2 border-primary';

// Modal Constants
export const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  '3xl': 'max-w-7xl',
  '5xl': 'max-w-[80rem]',
} as const;