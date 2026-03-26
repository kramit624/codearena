import { createSlice } from "@reduxjs/toolkit";

// Rehydrate from localStorage on app start
const savedUser = localStorage.getItem("ca_user");
const savedToken = localStorage.getItem("ca_token");

const initialState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedToken ? savedToken : null,
  isAuthenticated: !!savedToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      // Persist to localStorage
      localStorage.setItem("ca_user", JSON.stringify(action.payload.user));
      localStorage.setItem("ca_token", action.payload.accessToken);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("ca_user", JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("ca_user");
      localStorage.removeItem("ca_token");
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAccessToken = (state) => state.auth.accessToken;
