import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SearchLocation } from '@/types';
import { searchLocation } from '@/services/geocoding';

interface LocationSearchProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: SearchLocation) => void;
  icon?: React.ReactNode;
  onError?: (message: string | null) => void;
}

export const LocationSearch = ({
  label,
  placeholder = 'Enter an address',
  value,
  onChange,
  onSelect,
  icon,
  onError,
}: LocationSearchProps) => {
  const [suggestions, setSuggestions] = useState<SearchLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** -1 means "nothing highlighted"; the typed text stands on its own. */
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputId = useId();
  const listboxId = useId();
  const statusId = useId();

  // Keep a stable ref to the latest onError so the debounced callback never goes stale.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        setErrorMessage(null);
        onErrorRef.current?.(null);
        return;
      }

      try {
        const results = await searchLocation(query);
        setSuggestions(results);
        setActiveIndex(-1);
        setErrorMessage(null);
        onErrorRef.current?.(null);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Could not load location suggestions right now.';
        setSuggestions([]);
        setErrorMessage(message);
        onErrorRef.current?.(message);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, []);

  // Cancel pending search on unmount.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (value.length >= 3) {
      setIsLoading(true);
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setErrorMessage(null);
      setActiveIndex(-1);
      onError?.(null);
    }
  }, [value, debouncedSearch, onError]);

  const handleSelect = (location: SearchLocation) => {
    onChange(location.name);
    onSelect(location);
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setErrorMessage(null);
    onError?.(null);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setErrorMessage(null);
    onError?.(null);
  };

  const isListOpen = showSuggestions && suggestions.length > 0;

  /**
   * Keyboard handling for the suggestion list.
   *
   * Without this the list is visible but unreachable: arrow keys do nothing and
   * Enter does nothing, so a keyboard user can see results they cannot pick.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    if (!isListOpen) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        event.preventDefault();
        setShowSuggestions(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(suggestions.length - 1);
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-800 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden>
          {icon || <Search size={18} />}
        </div>
        <Input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isListOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={statusId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-11 pl-10 pr-12 text-base"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      {/* Announce search progress and results without stealing focus. */}
      <span id={statusId} className="sr-only" role="status">
        {isLoading
          ? 'Searching for addresses'
          : errorMessage
            ? errorMessage
            : suggestions.length > 0
              ? `${suggestions.length} suggestions available. Use the arrow keys to review them.`
              : ''}
      </span>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading || errorMessage) && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-600">
              Searching…
            </div>
          ) : errorMessage ? (
            <div className="px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : (
            <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`} className="list-none">
              {suggestions.map((location, index) => {
                const [primary, ...rest] = location.name.split(',');

                return (
                  <li
                    key={`${location.lat},${location.lng},${index}`}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(location)}
                      className={`flex w-full items-start gap-2 border-b border-gray-100 px-4 py-3 text-left last:border-0 ${
                        index === activeIndex ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" aria-hidden />
                      <span className="text-sm min-w-0">
                        <span className="block font-medium text-gray-900 truncate">
                          {primary}
                        </span>
                        <span className="block text-gray-600 text-xs mt-0.5 truncate">
                          {rest.join(',').trim()}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
