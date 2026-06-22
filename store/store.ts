import { configureStore } from "@reduxjs/toolkit";
import categoryReducer from "./slices/categorySlice";
import { searchTermSlice } from "./slices/searchTermSlice";
import { priceSlice } from "./slices/priceSlice";
import { wishListSlice } from "./slices/wishListSlice";
import { productsSlice } from "./slices/productsSlice";
import { cartSlice } from "./slices/cartSlice";
import filterReducer from "./slices/filterSlice";

const rootReducer = {
  category: categoryReducer,
  searchTerm: searchTermSlice.reducer,
  price: priceSlice.reducer,
  wishList: wishListSlice.reducer,
  products: productsSlice.reducer,
  cart: cartSlice.reducer,
  filters: filterReducer,
};

export function createStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
}

export type RootState = ReturnType<ReturnType<typeof createStore>["getState"]>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];