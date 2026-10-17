"use client";
import { useEffect, useRef, useState } from "react";
import { updateAddress } from "@/actions/address";

interface AddressFormValues {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

interface AddressSuggestion extends AddressFormValues {
  label: string;
}

interface AddressFormProps {
  address: AddressFormValues | null;
}

const MIN_QUERY_LENGTH = 4;
const DEBOUNCE_MS = 400;

export default function AddressForm({ address }: AddressFormProps) {
  const [street, setStreet] = useState(address?.street || "");
  const [city, setCity] = useState(address?.city || "");
  const [state, setState] = useState(address?.state || "");
  const [postalCode, setPostalCode] = useState(address?.postalCode || "");

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [verified, setVerified] = useState(false);

  // Autofilled streets should not trigger a new search for the same address.
  const skipNextSearchRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const query = street.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/address-suggestions?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        const results: AddressSuggestion[] = data.suggestions || [];
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlighted(results.length > 0 ? 0 : -1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [street]);

  const applySuggestion = (suggestion: AddressSuggestion) => {
    skipNextSearchRef.current = true;
    setStreet(suggestion.street);
    setCity(suggestion.city);
    setState(suggestion.state);
    setPostalCode(suggestion.postalCode);
    setVerified(true);
    setSuggestions([]);
    setIsOpen(false);
    setHighlighted(-1);
  };

  const handleStreetChange = (value: string) => {
    setStreet(value);
    setVerified(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(
        (index) => (index - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === "Enter") {
      if (highlighted >= 0) {
        event.preventDefault();
        applySuggestion(suggestions[highlighted]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const closeDropdown = () => {
    window.setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <form action={updateAddress}>
      <div className="street-field">
        <input
          type="text"
          name="street"
          placeholder="Calle y número"
          value={street}
          onChange={(event) => handleStreetChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={closeDropdown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="address-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted >= 0 ? `address-suggestion-${highlighted}` : undefined
          }
          required
        />
        {isSearching && <span className="address-search-status">Buscando...</span>}
        {isOpen && suggestions.length > 0 && (
          <ul className="address-suggestions" id="address-suggestions" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.label}
                id={`address-suggestion-${index}`}
                role="option"
                aria-selected={index === highlighted}
                className={index === highlighted ? "highlighted" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySuggestion(suggestion)}
              >
                {suggestion.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {verified ? (
        <p className="address-verified">✓ Dirección verificada</p>
      ) : (
        <p className="address-search-hint">
          Buscá tu calle y número para autocompletar el resto.
        </p>
      )}

      <input
        type="text"
        name="city"
        placeholder="Ciudad"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        required
      />
      <input
        type="text"
        name="state"
        placeholder="Provincia"
        value={state}
        onChange={(event) => setState(event.target.value)}
      />
      <input
        type="text"
        name="postalCode"
        placeholder="Código postal"
        value={postalCode}
        onChange={(event) => setPostalCode(event.target.value)}
        required
      />
      <button type="submit">Guardar dirección</button>
    </form>
  );
}
