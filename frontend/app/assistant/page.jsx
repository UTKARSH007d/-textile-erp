"use client";

import { apiFetch } from "../lib/api";

import { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState("");

  const quickQuestions = [
    "What are the pending orders?",
    "Show low stock yarn and fabrics",
    "What is the current production status?",
    "Are there any delayed orders?",
    "Are there any quality issues?",
    "Show overdue invoices",
  ];

  const askAssistant = async (customQuestion = null) => {
    const questionToAsk = customQuestion || question;

    if (!questionToAsk.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setData(null);

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/assistant/ask?question=${encodeURIComponent(
          questionToAsk
        )}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from AI assistant.");
      }

      const result = await response.json();

      setAnswer(result.answer || "No answer available.");
      setData(result.data || null);

      if (customQuestion) {
        setQuestion(customQuestion);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const getBusinessInsights = async () => {
    setInsightsLoading(true);
    setError("");
    setAnswer("");
    setData(null);

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/assistant/insights`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get business insights.");
      }

      const result = await response.json();

      setAnswer(result.answer || "Here are the current business insights.");
      setData(result.data || null);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const clearAssistant = () => {
    setQuestion("");
    setAnswer("");
    setData(null);
    setError("");
  };

  const renderInlineMarkdown = (text) => {
    const parts = String(text).split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-800"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const renderAnswer = (text) => {
    const lines = String(text).split(/\r?\n/);

    return (
      <div className="space-y-2 text-base leading-7 text-gray-800">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={index} className="h-1" />;
          }

          const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
          if (bulletMatch) {
            return (
              <div key={index} className="flex items-start gap-3 pl-1">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <div>{renderInlineMarkdown(bulletMatch[1])}</div>
              </div>
            );
          }

          const numberedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
          if (numberedMatch) {
            const number = trimmed.match(/^(\d+)\./)?.[1];

            return (
              <div key={index} className="flex items-start gap-3 pl-1">
                <span className="min-w-5 font-semibold text-blue-700">
                  {number}.
                </span>
                <div>{renderInlineMarkdown(numberedMatch[1])}</div>
              </div>
            );
          }

          return (
            <p key={index}>{renderInlineMarkdown(trimmed)}</p>
          );
        })}
      </div>
    );
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return "-";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const busy = loading || insightsLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            AI ERP Assistant
          </h1>

          <p className="mt-2 text-gray-600">
            Ask questions about your textile ERP business and get real-time
            insights from your ERP data.
          </p>
        </div>

        {/* Main Assistant Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Ask the Assistant
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Get information about orders, inventory, production, quality and
              finance.
            </p>
          </div>

          {/* Question Input */}
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  askAssistant();
                }
              }}
              placeholder="Ask a question about your business..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={() => askAssistant()}
              disabled={busy}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Ask Assistant"}
            </button>

            <button
              onClick={clearAssistant}
              disabled={busy}
              className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
            </button>
          </div>

          {/* Quick Questions */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Quick Questions
            </p>

            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((item) => (
                <button
                  key={item}
                  onClick={() => askAssistant(item)}
                  disabled={busy}
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Business Insights Button */}
          <div className="mt-6 border-t border-gray-200 pt-5">
            <button
              onClick={getBusinessInsights}
              disabled={busy}
              className="rounded-xl bg-purple-600 px-5 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {insightsLoading ? "Loading Insights..." : "Get Business Insights"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {busy && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

            <p className="font-medium text-gray-700">
              {insightsLoading
                ? "Generating business insights..."
                : "Analyzing ERP data..."}
            </p>
          </div>
        )}

        {/* Response */}
        {!busy && answer && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                🤖
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Assistant Response
                </h2>

                <p className="text-sm text-gray-500">
                  Based on your current ERP data
                </p>
              </div>
            </div>

            {/* Properly formatted AI response */}
            <div className="rounded-xl bg-blue-50 p-5">
              {renderAnswer(answer)}
            </div>

            {/* Data Table */}
            {data && (
              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Detailed Information
                </h3>

                {Array.isArray(data) ? (
                  data.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(data[0]).map((key) => (
                              <th
                                key={key}
                                className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
                              >
                                {key.replaceAll("_", " ")}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 bg-white">
                          {data.map((item, index) => (
                            <tr
                              key={index}
                              className="transition hover:bg-gray-50"
                            >
                              {Object.keys(data[0]).map((key) => (
                                <td
                                  key={key}
                                  className="whitespace-nowrap px-5 py-4 text-sm text-gray-700"
                                >
                                  {renderValue(item[key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 p-5 text-gray-500">
                      No detailed records found.
                    </div>
                  )
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(data).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <p className="text-sm capitalize text-gray-500">
                          {key.replaceAll("_", " ")}
                        </p>

                        <p className="mt-2 text-xl font-semibold text-gray-900">
                          {renderValue(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assistant Capabilities */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CapabilityCard
            title="Pending Orders"
            description="Check pending and active customer orders."
            icon="📋"
          />

          <CapabilityCard
            title="Low Stock"
            description="Identify low-stock yarn, fabric and products."
            icon="📦"
          />

          <CapabilityCard
            title="Production Status"
            description="Track planned, in-progress and completed production."
            icon="🏭"
          />

          <CapabilityCard
            title="Delayed Orders"
            description="Find orders that may miss their delivery date."
            icon="⚠️"
          />

          <CapabilityCard
            title="Quality Issues"
            description="View rejected quantities and quality problems."
            icon="🔍"
          />

          <CapabilityCard
            title="Overdue Invoices"
            description="Track unpaid and overdue customer invoices."
            icon="💰"
          />
        </div>
      </div>
    </div>
  );
}

function CapabilityCard({ title, description, icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="text-2xl">{icon}</div>

      <h3 className="mt-3 font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}
