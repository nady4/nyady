import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const searchTermSlice = createSlice({
  name: "searchTerm",
  initialState: "",
  reducers: {
    setSearchTerm: (_state, action: PayloadAction<string>) => action.payload,
  },
});

export const { setSearchTerm } = searchTermSlice.actions;
export default searchTermSlice.reducer;