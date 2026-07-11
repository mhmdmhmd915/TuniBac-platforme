import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AdminCardProps {
  children: ReactNode;
  className?: string;
}

export const AdminCard = ({
  children, className = ''
}: AdminCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#1A1A1A] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};
