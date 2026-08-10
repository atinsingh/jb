'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Shared motion primitives for the marketing surface.
 *
 * Three rules this file enforces so animation stays a polish layer rather than
 * a dependency:
 *
 * 1. Reduced motion is honoured everywhere. `useReducedMotion` collapses each
 *    variant to a plain opacity fade — no travel, no stagger delay. The site
 *    also carries a CSS `prefers-reduced-motion` block in PublicLayout, but
 *    Framer animates inline styles, which CSS cannot override, so it has to be
 *    handled in JS too.
 *
 * 2. Content is never hidden behind an animation that might not run. Every
 *    variant animates from `opacity: 0` but the element is in the DOM and
 *    `whileInView` uses `once: true` with a generous margin, so a section can't
 *    end up permanently invisible if the observer misfires — which is exactly
 *    how the previous scroll-reveal implementation shipped blank bands.
 *
 * 3. Only transform and opacity are animated, so every frame stays on the
 *    compositor.
 */

const EASE = [0.22, 0.61, 0.36, 1];

/** Fade + rise. The workhorse for section blocks. */
export function Reveal({ children, delay = 0, y = 18, className, as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: reduce ? 0.2 : 0.55, delay: reduce ? 0 : delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Parent for a staggered group. Pair with <StaggerItem> children.
 * Stagger is skipped entirely under reduced motion.
 */
export function Stagger({ children, className, gap = 0.08, as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: reduce ? 0 : gap } },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, y = 16, as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : y },
        shown: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.5, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Draws an SVG path on when it scrolls into view — used for the hero route arc,
 * where the line literally represents a journey being travelled.
 * Under reduced motion the path is simply present.
 */
export function DrawPath({ d, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <path d={d} {...rest} />;
  return (
    <motion.path
      d={d}
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.1, ease: EASE }}
      {...rest}
    />
  );
}

/** Pop-in for the route waypoint dots, sequenced along the arc. */
export function PopDot({ delay = 0, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <circle {...rest} />;
  return (
    <motion.circle
      initial={{ opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      {...rest}
    />
  );
}

/** Hover/press feedback for cards and rows. */
export const hoverLift = {
  whileHover: { y: -3 },
  whileTap: { y: 0 },
  transition: { duration: 0.2, ease: EASE },
};

export { motion, useReducedMotion };
