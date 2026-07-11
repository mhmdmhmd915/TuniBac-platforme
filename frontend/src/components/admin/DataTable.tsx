import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (value: unknown, item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idKey?: keyof T;
}

export const DataTable = <T extends { id?: string }>({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyState,
  selectedIds = [],
  onSelectionChange,
  idKey = 'id',
}: DataTableProps<T>) => {
  const getCellValue = (item: T, key: keyof T | string) => {
    if (key in item) {
      return item[key as keyof T];
    }

    return undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="max-h-[620px] overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/5 dark:border-white/5">
            {onSelectionChange && (
              <th className="sticky top-0 z-10 bg-white px-4 py-3 text-left dark:bg-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={selectedIds.length === data.length && data.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange(data.map((item) => item[idKey] as string));
                    } else {
                      onSelectionChange([]);
                    }
                  }}
                  className="rounded"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`sticky top-0 z-10 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:bg-[#1A1A1A] dark:text-gray-300 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <motion.tr
              key={String(item[idKey] ?? index)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRowClick?.(item)}
              className={`
                border-b border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
            >
              {onSelectionChange && (
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item[idKey] as string)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        onSelectionChange([...selectedIds, item[idKey] as string]);
                      } else {
                        onSelectionChange(
                          selectedIds.filter((id) => id !== item[idKey])
                        );
                      }
                    }}
                    className="rounded"
                  />
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-4 py-4 text-sm text-gray-700 dark:text-gray-300 ${col.className || ''}`}
                >
                  {col.render
                    ? col.render(getCellValue(item, col.key), item)
                    : String(getCellValue(item, col.key) ?? '')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
