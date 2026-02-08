'use client';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  className?: string;
  showClear?: boolean;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = '検索...',
  isLoading = false,
  submitLabel = '検索',
  loadingLabel = '検索中...',
  className,
  showClear = false,
}: SearchBoxProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showClear && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1.5 text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              クリア
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? loadingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
