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
  onClear?: () => void;
  disabled?: boolean;
}

export function SearchSelect({ label, placeholder, onSearch, onSelect, selectedLabel, onClear, disabled }: SearchSelectProps) {
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

  function handleClear(): void {
    setQuery("");
    setOptions([]);
    setOpen(false);
    onClear?.();
  }

  const showClear = selectedLabel !== undefined && onClear !== undefined && !disabled;

  return (
    <div ref={containerRef} className="relative">
      <label className="block font-sans text-sm font-semibold text-text">
        {label}
        <span className="relative mt-xs block">
          <input
            className={`field-input font-normal ${showClear ? "pr-10" : ""}`}
            placeholder={placeholder}
            value={selectedLabel ?? query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (options.length > 0) setOpen(true);
            }}
          />
          {showClear ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar seleção"
              title="Limpar seleção"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-background hover:text-text-strong"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                close
              </span>
            </button>
          ) : null}
        </span>
      </label>
      {open ? (
        <ul className="absolute z-10 max-h-48 w-full overflow-auto rounded-md border border-border bg-surface shadow-[0_4px_16px_-2px_rgba(92,75,50,0.08)]">
          {loading ? (
            <li className="px-md py-sm font-sans text-sm text-text-muted">Buscando...</li>
          ) : error ? (
            <li className="px-md py-sm font-sans text-sm text-aptIneligibleText">{error}</li>
          ) : options.length === 0 ? (
            <li className="px-md py-sm font-sans text-sm text-text-muted">Nenhum resultado</li>
          ) : (
            options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="block w-full px-md py-sm text-left font-sans text-sm hover:bg-background"
                  onClick={() => handleSelect(option)}
                >
                  <span className="font-semibold text-text-strong">{option.label}</span>
                  {option.sublabel ? <span className="ml-sm font-mono text-xs text-text-muted">{option.sublabel}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
