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

// ── Credit / user helpers ──────────────────────────────────────────────────

/** Fetch the current user's credit balance and plan info. */
export async function fetchUserCredits() {
  const { data } = await api.get("/api/user/credits");
  return data; // { credits, creditsResetAt, plan, subscriptionStatus, planAllowance }
}

/** Fetch subscription details. */
export async function fetchSubscription() {
  const { data } = await api.get("/api/payment/subscription");
  return data;
}

/** Create a Stripe Checkout session and return the redirect URL. */
export async function createCheckoutSession(priceId) {
  const { data } = await api.post("/api/payment/create-checkout-session", { priceId });
  return data; // { success, url }
}

/** Create a Stripe Customer Portal session and return the redirect URL. */
export async function createPortalSession() {
  const { data } = await api.post("/api/payment/create-portal-session");
  return data; // { success, url }
}

/** Refresh user info from /api/auth/me — keeps frontend in sync after login. */
export async function fetchMe() {
  const { data } = await api.get("/api/auth/me");
  return data; // { user }
}

export default api;
