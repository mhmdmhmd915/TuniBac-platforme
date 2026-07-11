import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  isVisible: boolean;
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const SuccessToast = ({
  isVisible,
  type,
  message,
  onClose,
}: ToastProps) => {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 dark:bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-500/30',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
    },
    warning: {
      icon: XCircle,
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
    },
  };

  const { icon: Icon, bg, text, border } = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg ${bg} ${border} border flex items-center gap-3`}
        >
          <Icon className={text} size={20} />
          <span className={text}>{message}</span>
          <button
            onClick={onClose}
            className={`ml-2 ${text} hover:opacity-70 transition-opacity`}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
