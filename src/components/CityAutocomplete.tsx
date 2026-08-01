"use client";

import { useEffect, useRef, useState } from "react";

export type CitySuggestion = { name: string; state: string };

type Props = {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onSelect: (suggestion: CitySuggestion) => void;
  disabled?: boolean;
};

const DEBOUNCE_MS = 300;

/** Autocomplete de cidades (spec autocomplete de cidades/IBGE) — busca por
 * prefixo em GET /api/cities, debounce de 300ms. Só emite onSelect quando o
 * usuário escolhe uma sugestão da lista; texto livre sem seleção não conta
 * como cidade válida (o form que consome isso decide se bloqueia o submit). */
export function CityAutocomplete({ city, state, onCityChange, onSelect, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const q = city.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q) {
      setSuggestions([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (state) params.set("state", state);
        const res = await fetch(`/api/cities?${params.toString()}`);
        const body = res.ok ? await res.json() : { cities: [] };
        setSuggestions(body.cities ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearched(true);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [city, state]);

  const showDropdown = open && city.trim().length > 0 && (suggestions.length > 0 || (searched && !loading));
  const listboxId = "city-autocomplete-listbox";

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        value={city}
        onChange={(e) => {
          onCityChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => city.trim() && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cidade"
        aria-label="Cidade"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        disabled={disabled}
        className="w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-card2 shadow-lg"
        >
          {suggestions.length > 0
            ? suggestions.map((s) => (
                <li key={`${s.state}-${s.name}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(s);
                      setOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-paper hover:bg-card"
                  >
                    {s.name} <span className="text-paperDim">({s.state})</span>
                  </button>
                </li>
              ))
            : !loading && (
                <li className="px-4 py-2 text-sm text-paperDim">Nenhuma cidade encontrada</li>
              )}
        </ul>
      )}
    </div>
  );
}
