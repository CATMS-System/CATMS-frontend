import React from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '../../theme/designSystem';

const VARIANT_CLASSES = {
  default: 'bg-white border border-slate-200/90 shadow-xs',
  elevated: 'bg-white border border-slate-200/80 shadow-md',
  glass: 'bg-white/90 backdrop-blur-md border border-white/60 shadow-lg',
  subtle: 'bg-slate-50/90 border border-slate-200/70 shadow-2xs',
  accent: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border border-blue-500/30 shadow-lg',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/**
 * Reusable Animated Card component with optional entrance animation and subtle hover elevation.
 * Drop-in replacement for plain `<div>` containers without altering inner logic or handlers.
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverEffect = true,
  animateEntrance = true,
  index = 0,
  className = '',
  onClick,
  ...rest
}) {
  const baseClasses = `rounded-2xl transition-colors duration-200 ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.default} ${PADDING_CLASSES[padding] ?? PADDING_CLASSES.md} ${hoverEffect ? 'ds-card-hover' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`.trim();

  const motionProps = animateEntrance
    ? {
        variants: MOTION_VARIANTS.fadeUp,
        initial: 'hidden',
        animate: 'visible',
        custom: index,
      }
    : {};

  const hoverProps = hoverEffect
    ? {
        whileHover: { y: -2, transition: { duration: 0.18, ease: 'easeOut' } },
        ...(onClick ? { whileTap: { scale: 0.99 } } : {}),
      }
    : {};

  return (
    <motion.div
      className={baseClasses}
      onClick={onClick}
      {...motionProps}
      {...hoverProps}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reusable Animated KPI StatCard component for role dashboards.
 */
export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'blue',
  index = 0,
  badge,
  className = '',
  onClick,
}) {
  const toneMap = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
      accentBar: 'from-blue-600 to-blue-400',
      subtext: 'text-blue-600',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
      accentBar: 'from-emerald-600 to-teal-400',
      subtext: 'text-emerald-600',
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
      accentBar: 'from-teal-600 to-cyan-400',
      subtext: 'text-teal-600',
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
      accentBar: 'from-indigo-600 to-violet-400',
      subtext: 'text-indigo-600',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      accentBar: 'from-amber-500 to-orange-400',
      subtext: 'text-amber-600',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
      accentBar: 'from-rose-600 to-pink-400',
      subtext: 'text-rose-600',
    },
  };

  const theme = toneMap[tone] || toneMap.blue;

  return (
    <Card
      index={index}
      hoverEffect
      padding="md"
      onClick={onClick}
      className={`relative overflow-hidden group ${className}`}
    >
      {/* Top subtle accent gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.accentBar} opacity-85`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {value}
          </p>
          {subtext && (
            <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${theme.subtext}`}>
              {subtext}
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {badge && <div className="mt-3 pt-2.5 border-t border-slate-100">{badge}</div>}
    </Card>
  );
}

export default Card;
