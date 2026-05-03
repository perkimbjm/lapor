/**
 * Semantic Text Components
 *
 * Reusable components that apply proper text colors from the color system.
 * These enforce consistent color usage across the application.
 *
 * Usage:
 * <Label>Form Label</Label>
 * <HelperText>This is a description</HelperText>
 * <Metadata>Created on Jan 1, 2024</Metadata>
 */

import React from 'react';
import { TEXT_COLOR, ICON_COLOR, type TextColorKey, type IconColorKey } from '@/lib/colors';

interface BaseProps {
  className?: string;
}

/**
 * Label Component
 * Use for form labels, field names
 * Applies TEXT_COLOR.TERTIARY (text-slate-500 dark:text-slate-400)
 */
export const Label: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <label className={`text-xs font-semibold uppercase tracking-widest ${TEXT_COLOR.TERTIARY} ${className}`}>
    {children}
  </label>
);

/**
 * HelperText Component
 * Use for descriptions, hints, helper messages
 * Applies TEXT_COLOR.SECONDARY (text-slate-600 dark:text-slate-300)
 */
export const HelperText: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <p className={`text-sm ${TEXT_COLOR.SECONDARY} ${className}`}>
    {children}
  </p>
);

/**
 * Metadata Component
 * Use for timestamps, file sizes, counts, dates
 * Applies TEXT_COLOR.SECONDARY (text-slate-600 dark:text-slate-300)
 */
export const Metadata: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <span className={`text-xs ${TEXT_COLOR.SECONDARY} ${className}`}>
    {children}
  </span>
);

/**
 * DisabledText Component
 * Use for disabled fields, placeholder text, very muted content
 * Applies TEXT_COLOR.DISABLED (text-slate-400 dark:text-slate-500)
 */
export const DisabledText: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <span className={`${TEXT_COLOR.DISABLED} ${className}`}>
    {children}
  </span>
);

/**
 * TextPrimary Component
 * Use for main headings, important content
 * Applies TEXT_COLOR.PRIMARY (text-slate-900 dark:text-white)
 */
export const TextPrimary: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <span className={`${TEXT_COLOR.PRIMARY} ${className}`}>
    {children}
  </span>
);

/**
 * TextSecondary Component
 * Use for descriptions, supporting text
 * Applies TEXT_COLOR.SECONDARY (text-slate-600 dark:text-slate-300)
 */
export const TextSecondary: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <span className={`${TEXT_COLOR.SECONDARY} ${className}`}>
    {children}
  </span>
);

/**
 * TextTertiary Component
 * Use for labels, weak emphasis
 * Applies TEXT_COLOR.TERTIARY (text-slate-500 dark:text-slate-400)
 */
export const TextTertiary: React.FC<{ children: React.ReactNode } & BaseProps> = ({
  children,
  className = '',
}) => (
  <span className={`${TEXT_COLOR.TERTIARY} ${className}`}>
    {children}
  </span>
);

/**
 * Icon Component Wrapper
 * Use for applying semantic colors to Lucide icons
 *
 * @param icon - Icon component (e.g., <AlertCircle />)
 * @param level - Color level: 'primary' | 'secondary' | 'muted'
 * @param size - Icon size in pixels
 */
interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  level?: 'primary' | 'secondary' | 'muted';
}

export const SemanticIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 20, level = 'primary', className = '', ...props }, ref) => {
    const colorClass = ICON_COLOR[level.toUpperCase() as Uppercase<typeof level>];
    return (
      <svg
        ref={ref}
        size={size}
        className={`${colorClass} ${className}`}
        {...props}
      />
    );
  }
);

SemanticIcon.displayName = 'SemanticIcon';

/**
 * Heading Component
 * Use for section headings and titles
 * Applies TEXT_COLOR.PRIMARY with heading styling
 */
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 'h2',
  className = '',
  ...props
}) => {
  const HeadingTag = level as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const baseClasses = `${TEXT_COLOR.PRIMARY} font-black uppercase tracking-tight`;

  const sizeClasses: Record<string, string> = {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    h4: 'text-lg',
    h5: 'text-base',
    h6: 'text-sm',
  };

  return (
    <HeadingTag className={`${baseClasses} ${sizeClasses[level]} ${className}`} {...props}>
      {children}
    </HeadingTag>
  );
};
