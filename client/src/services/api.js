import axios from "axios";

const BASE_API = import.meta.env.VITE_BASE_API;

if (!BASE_API) {
  throw new Error("VITE_BASE_API is not configured.");
}

const api = axios.create({
  baseURL: BASE_API,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export function getApiErrorMessage(error, fallbackMessage = "Something went wrong.") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    fallbackMessage
  );
}

export default api;