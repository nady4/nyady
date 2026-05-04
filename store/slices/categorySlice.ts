import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CategoryState {
  categories: string[];
  activeCategories: Record<string, boolean>;
}

const initialState: CategoryState = {
  categories: [],
  activeCategories: {},
};

export const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<string[]>) => {
      state.categories = action.payload;
      const activeCategories: Record<string, boolean> = {};
      action.payload.forEach((category) => {
        activeCategories[category] = true;
      });
      state.activeCategories = activeCategories;
    },
    toggleCategory: (state, action: PayloadAction<string>) => {
      const category = action.payload;
      state.activeCategories[category] = !state.activeCategories[category];
    },
  },
});

export const { setCategories, toggleCategory } = categorySlice.actions;
export default categorySlice.reducer;