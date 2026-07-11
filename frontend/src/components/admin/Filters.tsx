import { ReactNode } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
}

interface FiltersProps {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
  extra?: ReactNode;
}

export const Filters = ({ filters, onChange, extra }: FiltersProps) => {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap gap-3">
        {filters.map((filter) => (
          <label key={filter.key} className="flex min-w-[180px] flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              {filter.label}
            </span>
            <select
              value={filter.value}
              onChange={(event) => onChange(filter.key, event.target.value)}
              className="rounded-xl border-none bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-0 dark:bg-white/5 dark:text-white"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {extra}
    </div>
  );
};
