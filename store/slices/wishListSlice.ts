import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const wishListSlice = createSlice({
  name: "wishList",
  initialState: [] as string[],
  reducers: {
    addToWishList: (state, action: PayloadAction<string>) => {
      state.push(action.payload);
    },
    removeFromWishList: (state, action: PayloadAction<string>) => {
      return state.filter((id) => id !== action.payload);
    },
    initializeWishList: (state, action: PayloadAction<string[]>) => {
      return action.payload;
    },
  },
});

export const { addToWishList, removeFromWishList, initializeWishList } =
  wishListSlice.actions;
export default wishListSlice.reducer;