import React from 'react';
import { motion } from 'framer-motion';

const BUTTON_VARIANTS = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md focus-visible:ring-blue-500 border border-blue-600/20',
  accent:
    'bg-teal-600 hover:bg-teal-700 text-white shadow-xs hover:shadow-md focus-visible:ring-teal-500 border border-teal-600/20',
  secondary:
    'bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow-md focus-visible:ring-slate-700 border border-slate-800',
  outline:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs focus-visible:ring-blue-500',
  subtle:
    'bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/60 focus-visible:ring-blue-500',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow-md focus-visible:ring-red-500 border border-red-600/20',
  dangerSoft:
    'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 focus-visible:ring-red-500',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md focus-visible:ring-emerald-500 border border-emerald-600/20',
};

const BUTTON_SIZES = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-2 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-2xl gap-2.5',
};

/**
 * Reusable Animated Button component with hover & tap micro-interactions.
 * Preserves all standard HTML button attributes and event handlers.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  rightIcon: RightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading;

  const classes = [
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 select-none',
    BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
    BUTTON_SIZES[size] || BUTTON_SIZES.md,
    fullWidth ? 'w-full' : '',
    isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      whileHover={isDisabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={isDisabled ? undefined : { scale: 0.975, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className={classes}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
      {RightIcon && !loading && <RightIcon className="h-4 w-4 shrink-0" />}
    </motion.button>
  );
}

export default Button;
