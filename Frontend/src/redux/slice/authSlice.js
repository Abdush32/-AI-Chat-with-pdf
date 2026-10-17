import { createSlice } from "@reduxjs/toolkit";

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    details: null,
    logoutPath: "/",
  },
  reducers: {
    login: (state, action) => {
      return {
        ...state,
        details: action.payload,
      };
    },
    logout: (state) => {
      return {
        ...state,
        details: null,
      };
    },
  },
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
