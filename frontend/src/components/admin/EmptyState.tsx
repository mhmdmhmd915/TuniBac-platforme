import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: any;
  action?: ReactNode;
}

export const EmptyState = ({
  title, description, icon: Icon = Inbox, action
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl mb-4">
        <Icon size={48} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  );
};
