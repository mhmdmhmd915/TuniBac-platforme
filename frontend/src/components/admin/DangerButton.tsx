import { ReactNode } from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';

interface DangerButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const DangerButton = ({
  children, icon, fullWidth = false, className = '', ...props
}: DangerButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        bg-red-500 text-white px-6 py-3 rounded-xl font-bold
        flex items-center justify-center gap-2
        hover:bg-red-600 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
};
