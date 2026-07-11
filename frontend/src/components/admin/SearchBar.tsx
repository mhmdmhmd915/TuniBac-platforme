import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
}: SearchBarProps) => {
  return (
    <div className="relative">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        size={20}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-xl pl-12 pr-4 py-3
          text-gray-900 dark:text-white
          focus:ring-2 focus:ring-[#FFD700] outline-none"
      />
    </div>
  );
};
