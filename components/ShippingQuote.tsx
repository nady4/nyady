"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { ShippingQuoteResult } from "@/types";
import {
  quoteShippingToAddress,
  ShippingQuoteItem,
  AddressType
} from "@/actions/shipping";
import {
  ALLOWED_CARRIERS,
  getDeliveryWindow,
  isExcludedCarrier
} from "@/lib/shipping";
import { formatARS } from "@/lib/money";
import Link from "next/link";
import "@/styles/ShippingQuote.scss";

interface ShippingQuoteProps {
  address: AddressType | null;
  items: ShippingQuoteItem[];
  declaredValue: number;
  selectedOption?: ShippingQuoteResult | null;
  onSelectOption?: (option: ShippingQuoteResult | null) => void;
}

interface PickupPoint {
  point_id: number;
  description: string;
  location: {
    street: string;
    street_number: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface ServiceOption {
  carrier: { id: number; name: string };
  quote: ShippingQuoteResult;
}

interface ServiceGroup {
  service_type: { code: string; name: string };
  options: ServiceOption[];
}

export default function ShippingQuote({
  address,
  items,
  declaredValue,
  selectedOption,
  onSelectOption
}: ShippingQuoteProps) {
  const [quotes, setQuotes] = useState<ShippingQuoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPickupPoint, setSelectedPickupPoint] =
    useState<PickupPoint | null>(null);
  // The standard-delivery group starts expanded and ships pre-selected so no
  // user input is required to enable checkout (discovery, not mystery).
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["standard_delivery"])
  );
  const [expandedCarriers, setExpandedCarriers] = useState<Set<string>>(
    new Set()
  );
  const preselectedRef = useRef(false);

  const getDeliveryDays = useCallback(
    (quote: ShippingQuoteResult): { min: string; max: string } =>
      getDeliveryWindow(quote.delivery_time.estimated_delivery),
    []
  );

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleCarrier = useCallback((key: string) => {
    setExpandedCarriers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (serviceCode: string, option: ServiceOption, pickupPoint?: PickupPoint) => {
      if (onSelectOption) {
        const quoteToSelect: ShippingQuoteResult = {
          ...option.quote,
          pickup_points: pickupPoint ? [pickupPoint] : undefined,
          service_type: {
            code: serviceCode,
            name: option.quote.service_type.name
          }
        };
        onSelectOption(quoteToSelect);
        setSelectedPickupPoint(pickupPoint || null);
      }
    },
    [onSelectOption]
  );
  const isSelected = useCallback(
    (
      serviceCode: string,
      option: ServiceOption,
      pickupPoint?: PickupPoint
    ): boolean => {
      if (!selectedOption) return false;
      const sameCarrier = selectedOption.carrier.id === option.carrier.id;
      const sameService = selectedOption.service_type.code === serviceCode;
      if (!sameCarrier || !sameService) return false;
      if (pickupPoint) {
        return (
          selectedOption.pickup_points?.some(
            (p) => p.point_id === pickupPoint.point_id
          ) ?? false
        );
      }
      return (
        serviceCode !== "pickup_point" ||
        !selectedOption.pickup_points ||
        selectedOption.pickup_points.length === 0
      );
    },
    [selectedOption]
  );

  const groupedOptions = useMemo(() => {
    const filtered = quotes.filter(
      (q) =>
        ALLOWED_CARRIERS.includes(q.carrier.id) &&
        q.selectable !== false &&
        !isExcludedCarrier(q) &&
        (q.logistic_type === "carrier_dropoff" || q.logistic_type === "xd_dropoff")
    );

    const groups = new Map<string, ServiceGroup>();

    filtered.forEach((q) => {
      const code = q.service_type.code;
      if (!groups.has(code)) {
        groups.set(code, { service_type: q.service_type, options: [] });
      }
      const group = groups.get(code)!;
      const existingIdx = group.options.findIndex(
        (o) => o.carrier.id === q.carrier.id
      );
      if (existingIdx === -1) {
        group.options.push({ carrier: q.carrier, quote: q });
      } else if (
        q.amounts.price_incl_tax <
        group.options[existingIdx].quote.amounts.price_incl_tax
      ) {
        group.options[existingIdx] = { carrier: q.carrier, quote: q };
      }
    });

    groups.forEach((group) => {
      group.options.sort(
        (a, b) =>
          a.quote.amounts.price_incl_tax - b.quote.amounts.price_incl_tax
      );
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.service_type.code === "standard_delivery") return -1;
      if (b.service_type.code === "standard_delivery") return 1;
      return 0;
    });

    return sortedGroups;
  }, [quotes]);

  const fetchQuotes = useCallback(() => {
    if (!address || items.length === 0) return;

    setLoading(true);
    setError(null);

    quoteShippingToAddress(address, items, declaredValue)
      .then((result) => {
        setQuotes(result?.all_results || []);
      })
      .catch(() => {
        setError(
          "No pudimos calcular el envío en este momento. Verificá tu conexión e intentá de nuevo."
        );
        setQuotes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [address, items, declaredValue]);

  useEffect(() => {
    queueMicrotask(fetchQuotes);
  }, [fetchQuotes]);

  // Preselect the cheapest option of the first (expanded) group so the
  // checkout is actionable without hunting through collapsed panels.
  useEffect(() => {
    if (preselectedRef.current || loading || error) return;
    if (groupedOptions.length === 0 || selectedOption) return;
    const group = groupedOptions[0];
    if (group.options.length === 0) return;

    preselectedRef.current = true;
    const serviceCode = group.service_type.code;
    const cheapest = group.options[0];
    queueMicrotask(() => handleSelect(serviceCode, cheapest));
  }, [groupedOptions, loading, error, selectedOption, handleSelect]);

  if (!address) {
    return (
      <div className="shipping-quote">
        <div className="no-address">
          <p>Agregá una dirección</p>
          <Link href="/address" className="add-address-button">
            Agregar Dirección
          </Link>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="shipping-quote">
        <p className="loading" role="status" aria-live="polite">
          Calculando envío...
        </p>
      </div>
    );
  if (error)
    return (
      <div className="shipping-quote">
        <p className="error" role="alert">
          {error}
        </p>
        <button type="button" className="retry-button" onClick={fetchQuotes}>
          Reintentar
        </button>
      </div>
    );
  if (groupedOptions.length === 0)
    return (
      <div className="shipping-quote">
        <p className="no-quotes" role="status">
          No hay opciones de envío disponibles
        </p>
      </div>
    );

  return (
    <div className="shipping-quote">
      <h3>Opciones de envío</h3>
      <p className="elaboration-note">
        Tiempo de elaboración: mínimo 3 días hábiles
      </p>
      <div className="shipping-groups">
        {groupedOptions.map((group, gIdx) => {
          const groupKey = group.service_type.code;
          const isExpanded = expandedGroups.has(groupKey);
          const isDelivery = groupKey === "standard_delivery";

          return (
            <div key={gIdx} className="shipping-group">
              <button
                type="button"
                className="group-header"
                aria-expanded={isExpanded}
                aria-controls={`shipping-group-${groupKey}`}
                onClick={() => toggleGroup(groupKey)}
              >
                <span className="service-type-name">
                  {group.service_type.name}
                </span>
                <span className="group-toggle" aria-hidden="true">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded && (
                <div
                  className="group-options"
                  id={`shipping-group-${groupKey}`}
                  role="radiogroup"
                  aria-label={group.service_type.name}
                >
                  {group.options.map((option, oIdx) => {
                    const optionKey = `${groupKey}-${option.carrier.id}`;
                    const hasPoints =
                      !isDelivery &&
                      option.quote.pickup_points &&
                      option.quote.pickup_points.length > 0;
                    const isExpandedCarrier = expandedCarriers.has(optionKey);
                    const isOptionSelected = hasPoints
                      ? selectedPickupPoint !== null &&
                        option.quote.pickup_points!.some(
                          (p) => p.point_id === selectedPickupPoint.point_id
                        )
                      : isSelected(groupKey, option);

                    return (
                      <div
                        key={oIdx}
                        className={`carrier-option ${isOptionSelected ? "selected" : ""}`}
                      >
                        {isDelivery ? (
                          <label className="option-row">
                            <input
                              type="radio"
                              name={`shipping-${groupKey}`}
                              checked={isSelected(groupKey, option)}
                              onChange={() => handleSelect(groupKey, option)}
                            />
                            <span className="carrier-name rad-hidden">
                              {option.carrier.name}
                            </span>
                            <span className="delivery-time">
                              {getDeliveryDays(option.quote).min} -{" "}
                              {getDeliveryDays(option.quote).max}
                            </span>
                            <span className="option-price">
                              {formatARS(option.quote.amounts.price_incl_tax)}
                            </span>
                          </label>
                        ) : (
                          <>
                            {hasPoints ? (
                              <button
                                type="button"
                                className="option-row with-points"
                                aria-expanded={isExpandedCarrier}
                                aria-controls={`pickup-points-${optionKey}`}
                                onClick={() => toggleCarrier(optionKey)}
                              >
                                <span className="carrier-name">
                                  {option.carrier.name} (
                                  {option.quote.pickup_points?.length} puntos)
                                </span>
                                <span className="delivery-time">
                                  {getDeliveryDays(option.quote).min} -{" "}
                                  {getDeliveryDays(option.quote).max}
                                </span>
                                <span className="option-price">
                                  {formatARS(option.quote.amounts.price_incl_tax)}
                                </span>
                                <span
                                  className="group-toggle"
                                  aria-hidden="true"
                                >
                                  {isExpandedCarrier ? "▲" : "▶"}
                                </span>
                              </button>
                            ) : (
                              <label className="option-row">
                                <input
                                  type="radio"
                                  name={`shipping-${groupKey}`}
                                  checked={isSelected(groupKey, option)}
                                  onChange={() => handleSelect(groupKey, option)}
                                />
                                <span className="carrier-name">
                                  {option.carrier.name}
                                </span>
                                <span className="delivery-time">
                                  {getDeliveryDays(option.quote).min} -{" "}
                                  {getDeliveryDays(option.quote).max}
                                </span>
                                <span className="option-price">
                                  {formatARS(option.quote.amounts.price_incl_tax)}
                                </span>
                              </label>
                            )}

                            {hasPoints && isExpandedCarrier && (
                              <div
                                className="pickup-points-list"
                                id={`pickup-points-${optionKey}`}
                              >
                                {option.quote.pickup_points!.map(
                                  (point, pidx) => (
                                    <label
                                      key={pidx}
                                      className={`pickup-point-option ${selectedPickupPoint?.point_id === point.point_id ? "selected" : ""}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`pickup-${optionKey}`}
                                        checked={
                                          selectedPickupPoint?.point_id ===
                                          point.point_id
                                        }
                                        onChange={() =>
                                          handleSelect(groupKey, option, point)
                                        }
                                      />
                                      <span className="point-info">
                                        <strong>{point.description}</strong>
                                        <span className="point-address">
                                          {point.location.street}{" "}
                                          {point.location.street_number},{" "}
                                          {point.location.city},{" "}
                                          {point.location.state}{" "}
                                          {point.location.zipcode}
                                        </span>
                                      </span>
                                    </label>
                                  )
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
