"use client";

const TOKEN_KEYS = ["textile_erp_token", "access_token", "token"];

export function getAuthToken() {
  if (typeof window === "undefined") return null;

  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return null;
}

export function setAuthSession(token, user = null) {
  if (typeof window === "undefined") return;

  localStorage.setItem("textile_erp_token", token);
  localStorage.setItem("access_token", token);

  if (user) {
    localStorage.setItem("textile_erp_user", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  for (const key of [...TOKEN_KEYS, "textile_erp_user", "user"]) {
    localStorage.removeItem(key);
  }
}

export async function apiFetch(input, init = {}) {
  const token = getAuthToken();

  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Authentication required. Please login again.");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw new Error("Your session has expired. Please login again.");
  }

  return response;
}

export async function apiJSON(input, init = {}) {
  const response = await apiFetch(input, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.error?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(detail);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
