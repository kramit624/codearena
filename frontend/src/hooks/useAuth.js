import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectAccessToken,
  logout,
} from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import toast from "react-hot-toast";

export function useAuth() {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (_) {}
    dispatch(logout());
    navigate("/");
    toast.success("Logged out successfully");
  };

  return { user, isAuthenticated, accessToken, logout: handleLogout };
}
