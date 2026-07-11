import { ReactNode } from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';

interface ActionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'primary' | 'neutral' | 'danger' | 'success';
}

const toneClasses: Record<NonNullable<ActionButtonProps['tone']>, string> = {
  primary: 'bg-[#FFD700] text-black hover:bg-[#E6C200]',
  neutral: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600',
};

export const ActionButton = ({
  children,
  icon,
  tone = 'neutral',
  className = '',
  ...props
}: ActionButtonProps) => {
  const isDisabled = Boolean((props as any).disabled);

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${toneClasses[tone]} ${
        isDisabled ? 'cursor-not-allowed opacity-60' : ''
      } ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
};
