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
  /** Where to redirect after save (e.g. /cart when edited mid-checkout). */
  nextPath?: string;
}

const MIN_QUERY_LENGTH = 4;
const DEBOUNCE_MS = 400;

export default function AddressForm({ address, nextPath }: AddressFormProps) {
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
      queueMicrotask(() => {
        setSuggestions([]);
        setIsOpen(false);
      });
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
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      <div className="street-field">
        <label htmlFor="address-street" className="sr-only">
          Calle y número
        </label>
        <input
          id="address-street"
          type="text"
          name="street"
          placeholder="Calle y número"
          autoComplete="address-line1"
          value={street}
          onChange={(event) => handleStreetChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={closeDropdown}
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

      <label htmlFor="address-city" className="sr-only">
        Ciudad
      </label>
      <input
        id="address-city"
        type="text"
        name="city"
        placeholder="Ciudad"
        autoComplete="address-level2"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        required
      />
      <label htmlFor="address-state" className="sr-only">
        Provincia
      </label>
      <input
        id="address-state"
        type="text"
        name="state"
        placeholder="Provincia"
        autoComplete="address-level1"
        value={state}
        onChange={(event) => setState(event.target.value)}
      />
      <label htmlFor="address-postal-code" className="sr-only">
        Código postal
      </label>
      <input
        id="address-postal-code"
        type="text"
        name="postalCode"
        placeholder="Código postal"
        autoComplete="postal-code"
        value={postalCode}
        onChange={(event) => setPostalCode(event.target.value)}
        required
      />
      <button type="submit">Guardar dirección</button>
    </form>
  );
}
