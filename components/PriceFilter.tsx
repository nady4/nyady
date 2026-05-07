import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useStore";
import { setMin, setMax } from "@/store/slices/priceSlice";
import "@/styles/PriceFilter.scss";

const DoubleRangeSlider = () => {
  const dispatch = useAppDispatch();

  const priceState = useAppSelector(
    (state) => state.price as { min: number; max: number } | undefined
  );

  const min = priceState?.min ?? 0;
  const max = priceState?.max ?? 50000;

  const minLimit = 0;
  const maxLimit = 50000;

  const handleMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      dispatch(setMin(Math.min(value, max - 1)));
    },
    [dispatch, max]
  );

  const handleMaxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      dispatch(setMax(Math.max(value, min + 1)));
    },
    [dispatch, min]
  );

  const safeMin = Math.max(minLimit, Math.min(min, maxLimit - 1));
  const safeMax = Math.min(maxLimit, Math.max(max, minLimit + 1));

  const minPercent = ((safeMin - minLimit) / (maxLimit - minLimit)) * 100;
  const maxPercent = ((safeMax - minLimit) / (maxLimit - minLimit)) * 100;

  return (
    <div
      className="price-filter"
      style={
        {
          "--min": `${minPercent}%`,
          "--max": `${maxPercent}%`,
        } as React.CSSProperties
      }
    >
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={1}
        value={safeMin}
        onChange={handleMinChange}
        className="price-filter-input min-range"
      />
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={1}
        value={safeMax}
        onChange={handleMaxChange}
        className="price-filter-input max-range"
      />
      <div className="range-values">
        <span className="min-value" style={{ left: `${minPercent}%` }}>
          {(safeMin / 1000).toFixed(0)}k
        </span>
        <span className="max-value" style={{ left: `${maxPercent}%` }}>
          {(safeMax / 1000).toFixed(0)}k
        </span>
      </div>
    </div>
  );
};

export default DoubleRangeSlider;