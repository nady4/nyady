import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductType } from "@/types";

export const productsSlice = createSlice({
  name: "products",
  initialState: [] as ProductType[],
  reducers: {
    setProducts: (state, action: PayloadAction<ProductType[]>) => {
      return [...action.payload];
    },
  },
});

export const { setProducts } = productsSlice.actions;
export default productsSlice.reducer;