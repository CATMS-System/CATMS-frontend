import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION_VARIANTS, ensureMotionSafeEnv } from '../../theme/designSystem';

/**
 * Reusable Page / Subview Transition Wrapper.
 * Fast, subtle fade + vertical slide (< 250ms) when switching routes or tabs.
 */
export function PageTransition({
  children,
  transitionKey,
  className = '',
  mode = 'wait',
}) {
  ensureMotionSafeEnv();
  if (transitionKey !== undefined) {
    return (
      <AnimatePresence mode={mode} initial={false}>
        <motion.div
          key={transitionKey}
          variants={MOTION_VARIANTS.pageEnter}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      variants={MOTION_VARIANTS.pageEnter}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container that staggers the entrance of child StaggerItem elements.
 */
export function StaggerContainer({ children, className = '', ...rest }) {
  ensureMotionSafeEnv();
  return (
    <motion.div
      variants={MOTION_VARIANTS.staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Child item inside a StaggerContainer.
 */
export function StaggerItem({ children, className = '', ...rest }) {
  ensureMotionSafeEnv();
  return (
    <motion.div
      variants={MOTION_VARIANTS.staggerItem}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Smooth shimmer loading skeleton primitive.
 */
export function Skeleton({ className = 'h-4 w-full rounded-lg' }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Pre-built skeleton for KPI Stat Cards.
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Pre-built skeleton for Data Tables.
 */
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4 space-y-3"
      role="status"
      aria-label="Loading data"
    >
      <div className="grid gap-4 pb-3 border-b border-slate-100" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 w-3/4 rounded-md" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 py-2.5 border-b border-slate-50 last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className="h-4 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default PageTransition;
