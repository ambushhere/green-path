import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SearchLocation } from '@/types';
import { searchLocation } from '@/services/geocoding';
import { debounce } from '@/lib/utils';

interface LocationSearchProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: SearchLocation) => void;
  icon?: React.ReactNode;
}

export const LocationSearch = ({
  label,
  placeholder = 'Enter address...',
  value,
  onChange,
  onSelect,
  icon
}: LocationSearchProps) => {
  const [suggestions, setSuggestions] = useState<SearchLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      const results = await searchLocation(query);
      setSuggestions(results);
      setIsLoading(false);
    }, 500),
    []
  );

  useEffect(() => {
    if (value.length >= 3) {
      setIsLoading(true);
      debouncedSearch(value);
    } else {
      setSuggestions([]);
    }
  }, [value, debouncedSearch]);

  const handleSelect = (location: SearchLocation) => {
    onChange(location.name);
    onSelect(location);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon || <Search size={18} />}
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching...
            </div>
          ) : (
            suggestions.map((location, index) => (
              <button
                key={index}
                onClick={() => handleSelect(location)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-0"
              >
                <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {location.name.split(',')[0]}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    {location.name.split(',').slice(1).join(',')}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
