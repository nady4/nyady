import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
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

const selectProductsState = (state: { products: ProductType[] }) => state.products;
const selectCategory = (_: { category: string }) => _.category;

export const selectAllProducts = createSelector(
  [selectProductsState],
  (products) => products
);

export const selectFilteredProducts = createSelector(
  [selectProductsState, selectCategory],
  (products, category) => {
    if (!category || category === "all") return products;
    return products.filter((p) => p.category === category);
  }
);

export default productsSlice.reducer;