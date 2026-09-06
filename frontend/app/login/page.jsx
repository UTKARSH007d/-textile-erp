"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Factory, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import {
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "../lib/api";

const API_URL = "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setChecking(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
      .then((response) => {
        if (response.ok) {
          router.replace("/");
          return;
        }

        clearAuthSession();
        setChecking(false);
      })
      .catch(() => {
        clearAuthSession();
        setChecking(false);
      });
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      const body = new URLSearchParams();
      body.set("username", username.trim());
      body.set("password", password);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail || "Invalid username or password."
        );
      }

      const token =
        data?.access_token ||
        data?.token ||
        data?.accessToken;

      if (!token) {
        throw new Error(
          "Login succeeded, but the server did not return an access token."
        );
      }

      setAuthSession(token, data?.user || null);

      const meResponse = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const meData = await meResponse.json().catch(() => ({}));

      if (!meResponse.ok) {
        clearAuthSession();

        throw new Error(
          meData?.detail || "Unable to load your user profile."
        );
      }

      const user = meData?.user || meData;

      setAuthSession(token, user);

      router.replace("/");
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2
          className="animate-spin text-slate-900"
          size={28}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Factory size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            TextileERP
          </h1>

          <p className="mt-1 text-sm text-slate-700">
            Manufacturing Suite
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-slate-700">
              Sign in to access the ERP system.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* USERNAME */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* SIGN IN */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}