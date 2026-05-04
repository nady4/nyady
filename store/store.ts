import { configureStore } from "@reduxjs/toolkit";
import categoryReducer from "./slices/categorySlice";
import { searchTermSlice } from "./slices/searchTermSlice";
import { priceSlice } from "./slices/priceSlice";
import { wishListSlice } from "./slices/wishListSlice";
import { productsSlice } from "./slices/productsSlice";
import { cartSlice } from "./slices/cartSlice";

export const store = configureStore({
  reducer: {
    category: categoryReducer,
    searchTerm: searchTermSlice.reducer,
    price: priceSlice.reducer,
    wishList: wishListSlice.reducer,
    products: productsSlice.reducer,
    cart: cartSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;