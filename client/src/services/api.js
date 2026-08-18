import axios from "axios";

const runtimeEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const BASE_API = runtimeEnv.VITE_BASE_API || process.env?.VITE_BASE_API || globalThis.__VITE_BASE_API__;

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

export async function submitInterviewAndFeedback(apiClient = api, interviewId) {
  const completionResponse = await apiClient.post(`/api/interview/${interviewId}/complete`);
  const feedbackResponse = await apiClient.post(`/api/interview/${interviewId}/feedback`);

  return {
    ...completionResponse?.data,
    feedback: feedbackResponse?.data?.feedback ?? feedbackResponse?.data ?? null,
    interviewId: completionResponse?.data?.interviewId ?? interviewId,
  };
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

/**
 * Authenticate with Google using the credential from Google Identity Services.
 * Works for both login and registration — the backend handles both cases.
 * @param {string} credential  Google ID token from the GSI prompt/button
 * @returns {{ token: string, user: object }}
 */
export async function googleAuthApi(credential) {
  const { data } = await api.post("/api/auth/google", { credential });
  return data; // { message, token, user }
}

/**
 * Submit the anti-cheating summary at the end of an interview.
 * @param {string} interviewId
 * @param {{ tabSwitchCount, fullscreenExitCount, copyAttemptCount, pasteAttemptCount, cutAttemptCount, violations }} summary
 */
export async function submitAntiCheating(interviewId, summary) {
  const { data } = await api.post(`/api/interview/${interviewId}/anti-cheating`, summary);
  return data;
}

/**
 * Terminate an interview due to cheating.
 * Saves the anti-cheating summary and sets status to "terminated".
 * @param {string} interviewId
 * @param {{ tabSwitchCount, fullscreenExitCount, copyAttemptCount, pasteAttemptCount, cutAttemptCount, violations, terminationReason }} payload
 */
export async function terminateForCheating(interviewId, payload) {
  const { data } = await api.post(`/api/interview/${interviewId}/terminate-cheating`, payload);
  return data;
}

export default api;
