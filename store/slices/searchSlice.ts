import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SearchState {
  query: string;
}

const initialState: SearchState = { query: "" };

/**
 * Catalog-only text search, kept in the URL (?q=) so results stay
 * shareable; the slice mirrors the value for instant client re-filtering.
 */
export const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearch: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    resetSearch: (state) => {
      state.query = "";
    },
  },
});

export const { setSearch, resetSearch } = searchSlice.actions;
export default searchSlice.reducer;
