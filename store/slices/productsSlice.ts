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
const selectSearchTerm = (_: { searchTerm: string }) => _.searchTerm;
const selectCategory = (_: { category: string }) => _.category;

export const selectAllProducts = createSelector(
  [selectProductsState],
  (products) => products
);

export const selectFilteredProducts = createSelector(
  [selectProductsState, selectSearchTerm, selectCategory],
  (products, searchTerm, category) => {
    let filtered = products;

    if (category && category !== "all") {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(term) ||
              p.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }
);

export default productsSlice.reducer;