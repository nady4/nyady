import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PriceState {
  boundsMin: number;
  boundsMax: number;
  min: number | null; // null = untouched (no filtering)
  max: number | null;
}

const initialState: PriceState = {
  boundsMin: 0,
  boundsMax: 0,
  min: null,
  max: null,
};

export const priceSlice = createSlice({
  name: "price",
  initialState,
  reducers: {
    // Server (or preload) tells the UI the real min/max of the catalog.
    initPriceFilter: (state, action: PayloadAction<{ min: number; max: number }>) => {
      state.boundsMin = action.payload.min;
      state.boundsMax = action.payload.max;
    },
    setMin: (state, action: PayloadAction<number>) => {
      state.min = action.payload;
    },
    setMax: (state, action: PayloadAction<number>) => {
      state.max = action.payload;
    },
    resetPriceFilter: (state) => {
      state.min = null;
      state.max = null;
    },
  },
});

export const { initPriceFilter, setMin, setMax, resetPriceFilter } = priceSlice.actions;
export default priceSlice.reducer;
