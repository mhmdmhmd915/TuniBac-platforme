import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  bg: string;
  delay?: number;
}

export const StatCard = ({
  label, value, icon, color, bg, delay = 0
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-md transition-all duration-300 border border-black/5 dark:border-white/5"
    >
      <div className={`p-4 ${bg} ${color} rounded-2xl w-fit`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </div>
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
      </div>
    </motion.div>
  );
};
