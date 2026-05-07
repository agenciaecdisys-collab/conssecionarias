import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchAddresses, GeocodingResult } from "@/services/geocoding";

export interface AddressData {
  address: string;
  number: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
}

const AddressAutocomplete = ({ value, onChange }: AddressAutocompleteProps) => {
  const [query, setQuery] = useState(value.address || '');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [confirmed, setConfirmed] = useState(!!(value.latitude && value.longitude));
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value.address || '');
    setConfirmed(!!(value.latitude && value.longitude));
  }, [value.address, value.latitude, value.longitude]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSearch = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddresses(text);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setConfirmed(false);
    onChange({ ...value, address: text, latitude: null, longitude: null });
    debouncedSearch(text);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.displayName);
    setConfirmed(true);
    onChange({
      ...value,
      address: result.displayName,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setShowDropdown(false);
    setSuggestions([]);
    setTimeout(() => numberRef.current?.focus(), 100);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, number: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
          <div className="relative">
            <Input
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              className="bg-secondary/50 border-border pl-9"
              placeholder="Digite o endereço da loja..."
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : confirmed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <MapPin className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-[9999] w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
            {suggestions.map((result, index) => (
              <button
                key={`${result.latitude}-${result.longitude}`}
                type="button"
                onClick={() => handleSelect(result)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 transition-colors ${
                  index === highlightedIndex
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-secondary/50 text-foreground"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-2">{result.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-32">
        <label className="text-xs text-muted-foreground mb-1 block">Número</label>
        <Input
          ref={numberRef}
          value={value.number || ''}
          onChange={handleNumberChange}
          className="bg-secondary/50 border-border"
          placeholder="Nº"
        />
      </div>

      {confirmed && value.latitude !== null && value.longitude !== null && (
        <div className="flex items-center gap-1.5 text-xs text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Coordenadas: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
