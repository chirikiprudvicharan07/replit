import React from 'react';
import { Search } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterLabel?: string;
  children?: React.ReactNode;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
      <div className="flex flex-1 items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions && onFilterChange && (
          <div className="flex items-center gap-1.5">
            {filterLabel && <span className="text-xs text-slate-500">{filterLabel}:</span>}
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
