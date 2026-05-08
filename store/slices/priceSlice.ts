import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const priceSlice = createSlice({
  name: "price",
  initialState: { min: 20000, max: 30000 },
  reducers: {
    setMin: (state, action: PayloadAction<number>) => {
      state.min = action.payload;
    },
    setMax: (state, action: PayloadAction<number>) => {
      state.max = action.payload;
    },
  },
});

export const { setMin, setMax } = priceSlice.actions;
export default priceSlice.reducer;