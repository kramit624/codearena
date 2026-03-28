import axios from "axios";
import store from "../store/store.js";
import { logout } from "../store/slices/authSlice.js";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // 🔥 cookies will be sent automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// 🔥 Auto-refresh on 401
// ===============================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🔥 FIXED CONDITION (prevents infinite loop)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 🔥 call refresh (cookie-based)
        await axiosInstance.post("/auth/refresh");

        processQueue(null);

        // 🔁 retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // ❌ logout if refresh fails
        store.dispatch(logout());

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
