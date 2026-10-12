/**
 * CareFlow CATMS — Shared Design System & Motion Tokens
 * Provides a single source of truth for brand palette, complementary accents,
 * typography scale, spacing, radii, shadows, and Framer Motion presets.
 */

export const THEME = {
  colors: {
    // Primary Brand — CareFlow Medical Blue
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb', // Primary brand color
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Complementary Accent — Clinical Teal / Cyan
    accent: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      400: '#2dd4bf',
      500: '#14b8a6', // Complementary accent
      600: '#0d9488',
      700: '#0f766e',
    },
    // Secondary Highlight — Indigo
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
    },
    // Semantic Status Palette
    semantic: {
      success: '#10b981',
      successSoft: '#ecfdf5',
      warning: '#f59e0b',
      warningSoft: '#fffbeb',
      danger: '#ef4444',
      dangerSoft: '#fef2f2',
      info: '#0ea5e9',
      infoSoft: '#f0f9ff',
    },
    // Neutral Slate Surfaces
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    // Chart Series Palette (Recharts)
    chart: ['#2563eb', '#0d9488', '#6366f1', '#f59e0b', '#10b981', '#ec4899'],
  },

  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    base: '1rem',   // 16px
    lg: '1.25rem',  // 20px
    xl: '1.5rem',   // 24px
    '2xl': '2rem',  // 32px
    '3xl': '2.5rem' // 40px
  },

  radii: {
    sm: '0.5rem',     // 8px  (rounded-lg)
    md: '0.75rem',    // 12px (rounded-xl)
    lg: '1rem',       // 16px (rounded-2xl)
    xl: '1.5rem',     // 24px (rounded-3xl)
    full: '9999px',
  },

  shadows: {
    xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
    sm: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
    md: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
    lg: '0 10px 20px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
    xl: '0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    primaryGlow: '0 8px 20px -4px rgba(37, 99, 235, 0.35)',
    accentGlow: '0 8px 20px -4px rgba(13, 148, 136, 0.30)',
  },

  typography: {
    display: 'text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900',
    h1: 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900',
    h2: 'text-lg sm:text-xl font-bold tracking-tight text-slate-900',
    h3: 'text-base font-bold text-slate-800',
    h4: 'text-sm font-bold text-slate-800',
    subtitle: 'text-xs sm:text-sm font-medium text-slate-500',
    body: 'text-sm text-slate-700 leading-relaxed',
    bodySm: 'text-xs text-slate-600 leading-normal',
    caption: 'text-[11px] font-semibold uppercase tracking-wider text-slate-400',
  },
};

/**
 * Standard Framer Motion variants for consistent, snappy (< 300ms) SaaS animations
 */
export const MOTION_VARIANTS = {
  pageEnter: {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
    },
  },

  fadeUp: {
    hidden: { opacity: 0, y: 14 },
    visible: (index = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        delay: Math.min(index * 0.055, 0.35),
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  },

  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.02,
      },
    },
  },

  staggerItem: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
    },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.96, y: 6 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: 4,
      transition: { duration: 0.16 },
    },
  },
};

export default THEME;
