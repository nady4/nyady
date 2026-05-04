import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const cartSlice = createSlice({
  name: "cart",
  initialState: [] as string[],
  reducers: {
    addToCart: (state, action: PayloadAction<string>) => {
      if (!state.includes(action.payload)) {
        state.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      return state.filter((id) => id !== action.payload);
    },
    clearCart: () => {
      return [];
    },
    initializeCart: (state, action: PayloadAction<string[]>) => {
      return action.payload;
    },
  },
});

export const { addToCart, removeFromCart, clearCart, initializeCart } =
  cartSlice.actions;
export default cartSlice.reducer;