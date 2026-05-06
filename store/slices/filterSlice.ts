"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ActiveFilters = Record<string, boolean>;

interface FilterState {
  activeSizes: ActiveFilters;
  activeColors: ActiveFilters;
}

const initialState: FilterState = {
  activeSizes: {},
  activeColors: {},
};

const filterSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    toggleSize: (state, action: PayloadAction<string>) => {
      const size = action.payload;
      state.activeSizes[size] = !state.activeSizes[size];
    },
    toggleColor: (state, action: PayloadAction<string>) => {
      const color = action.payload;
      state.activeColors[color] = !state.activeColors[color];
    },
    resetFilters: (state) => {
      state.activeSizes = {};
      state.activeColors = {};
    },
    setActiveColors: (state, action: PayloadAction<string[]>) => {
      const colors = action.payload;
      state.activeColors = colors.reduce((acc, color) => {
        acc[color] = true;
        return acc;
      }, {} as ActiveFilters);
    },
  },
});

export const { toggleSize, toggleColor, resetFilters, setActiveColors } = filterSlice.actions;
export default filterSlice.reducer;