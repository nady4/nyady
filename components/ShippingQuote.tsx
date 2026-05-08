"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { ShippingQuoteResult } from "@/types";
import {
  quoteShippingToAddress,
  ShippingQuoteItem,
  AddressType
} from "@/actions/shipping";
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

const ALLOWED_CARRIERS = [233, 208];

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedCarriers, setExpandedCarriers] = useState<Set<string>>(
    new Set()
  );
  const fetchRequestedRef = useRef(false);

  const getDeliveryDays = useCallback((dateStr: string): { min: number; max: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(dateStr);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { min: days, max: days + 7 };
  }, []);

  const formatDeliveryDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 3);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short"
    });
  }, []);

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

  useEffect(() => {
    if (!address || items.length === 0 || fetchRequestedRef.current) return;

    fetchRequestedRef.current = true;
    setLoading(true);
    setError(null);

    quoteShippingToAddress(address, items, declaredValue)
      .then((result) => {
        if (result) {
          setQuotes(result.all_results || []);
        } else {
          setQuotes([]);
        }
      })
      .catch(() => {
        setError("Failed to quote shipping");
        setQuotes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [address?.id, items.length, declaredValue, address, items]);

  const groupedOptions = useMemo(() => {
    const filtered = quotes.filter(
      (q) =>
        ALLOWED_CARRIERS.includes(q.carrier.id) &&
        q.selectable !== false &&
        q.logistic_type === "carrier_dropoff"
    );
    const groups = new Map<string, ServiceGroup>();

    console.log(
      "[ShippingQuote] All logistic_types:",
      quotes.map((q) => q.logistic_type)
    );
    console.log(
      "[ShippingQuote] Filtered options (carrier_dropoff only):",
      filtered
    );

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

    return Array.from(groups.values());
  }, [quotes]);

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
        <p className="loading">Calculando envío...</p>
      </div>
    );
  if (error)
    return (
      <div className="shipping-quote">
        <p className="error">{error}</p>
      </div>
    );
  if (groupedOptions.length === 0)
    return (
      <div className="shipping-quote">
        <p className="no-quotes">No hay opciones de envío disponibles</p>
      </div>
    );

  return (
    <div className="shipping-quote">
      <h3>Opciones de envío</h3>
      <p className="elaboration-note">
        Los productos se <Link href="/elaboracion">elaboran</Link> entre 3 y 7 días
      </p>
      <div className="shipping-groups">
        {groupedOptions.map((group, gIdx) => {
          const groupKey = group.service_type.code;
          const isExpanded = expandedGroups.has(groupKey);
          const isDelivery = groupKey === "standard_delivery";

          return (
            <div key={gIdx} className="shipping-group">
              <div
                className="group-header"
                onClick={() => toggleGroup(groupKey)}
              >
                <span className="service-type-name">
                  {group.service_type.name}
                </span>
                <span className="group-toggle">{isExpanded ? "▲" : "▼"}</span>
              </div>

              {isExpanded && (
                <div className="group-options">
                  {group.options.map((option, oIdx) => {
                    const optionKey = `${groupKey}-${option.carrier.id}`;
                    const hasPoints =
                      !isDelivery &&
                      option.quote.pickup_points &&
                      option.quote.pickup_points.length > 0;
                    const isExpandedCarrier = expandedCarriers.has(optionKey);
                    const isOptionSelected = isSelected(groupKey, option);

                    return (
                      <div
                        key={oIdx}
                        className={`carrier-option ${isOptionSelected ? "selected" : ""}`}
                      >
                        {isDelivery ? (
                          <div
                            className="option-row"
                            onClick={() => handleSelect(groupKey, option)}
                          >
                            <span className="carrier-name">
                              {option.carrier.name}
                            </span>
                            <span className="delivery-time">
                              {getDeliveryDays(
                                option.quote.delivery_time.estimated_delivery
                              ).min}
                              {" a "}
                              {getDeliveryDays(
                                option.quote.delivery_time.estimated_delivery
                              ).max}
                              {" días"}
                            </span>
                            <span className="option-price">
                              ${option.quote.amounts.price_incl_tax.toLocaleString("es-AR")}
                            </span>
                          </div>
                        ) : (
                          <>
<div
                            className="option-row with-points"
                            onClick={() =>
                              hasPoints
                                ? toggleCarrier(optionKey)
                                : handleSelect(groupKey, option)
                            }
                          >
                            <span className="carrier-name">
                              {option.carrier.name}
                            </span>
                            {hasPoints && (
                              <span className="pickup-count">
                                ({option.quote.pickup_points?.length} puntos) ▶
                              </span>
                            )}
                            <span className="delivery-time">
                              {getDeliveryDays(
                                option.quote.delivery_time.estimated_delivery
                              ).min}
                              {" a "}
                              {getDeliveryDays(
                                option.quote.delivery_time.estimated_delivery
                              ).max}
                              {" días"}
                            </span>
                            <span className="option-price">
                              $
                              {option.quote.amounts.price_incl_tax.toFixed(2)}
                            </span>
                          </div>

                            {hasPoints && isExpandedCarrier && (
                              <div className="pickup-points-list">
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
