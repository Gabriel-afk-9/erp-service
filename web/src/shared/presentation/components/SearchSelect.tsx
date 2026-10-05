import { useEffect, useRef, useState } from "react";

export interface SearchOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchSelectProps {
  label: string;
  placeholder: string;
  onSearch: (query: string) => Promise<SearchOption[]>;
  onSelect: (id: string) => void;
  selectedLabel?: string;
  disabled?: boolean;
}

export function SearchSelect({ label, placeholder, onSearch, onSelect, selectedLabel, disabled }: SearchSelectProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          setOptions(await onSearch(query.trim()));
          setOpen(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro na busca");
          setOpen(true);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [query, onSearch]);

  function handleSelect(option: SearchOption): void {
    onSelect(option.id);
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm">
        {label}
        <input
          className="mt-1 w-full rounded border px-2 py-1"
          placeholder={placeholder}
          value={selectedLabel ?? query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
        />
      </label>
      {open ? (
        <ul className="absolute z-10 max-h-48 w-full overflow-auto rounded border bg-white shadow">
          {loading ? (
            <li className="px-2 py-1 text-sm text-gray-500">Buscando...</li>
          ) : error ? (
            <li className="px-2 py-1 text-sm text-red-700">{error}</li>
          ) : options.length === 0 ? (
            <li className="px-2 py-1 text-sm text-gray-500">Nenhum resultado</li>
          ) : (
            options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="block w-full px-2 py-1 text-left text-sm hover:bg-gray-100"
                  onClick={() => handleSelect(option)}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.sublabel ? <span className="ml-2 text-gray-500">{option.sublabel}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
