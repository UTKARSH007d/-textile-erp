"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:8000";

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("textile_erp_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function isStockIn(type) {
  const value = normalizeType(type);
  return value === "stock in" || value === "production output";
}

function isStockOut(type) {
  const value = normalizeType(type);
  return value === "stock out" || value === "dispatch out" || value === "quality rejection";
}

function isTransfer(item) {
  const value = normalizeType(item?.movement_type);
  return (
    value === "transfer" ||
    value === "transfer in" ||
    value === "transfer out" ||
    Boolean(item?.from_warehouse_id && item?.to_warehouse_id)
  );
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = getAuthHeaders();

      const [movementResponse, inventoryResponse] = await Promise.all([
        fetch(`${API_URL}/api/inventory/movements/all`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/inventory/`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (movementResponse.status === 401 || inventoryResponse.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("textile_erp_token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          localStorage.removeItem("textile_erp_user");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return;
      }

      if (!movementResponse.ok) {
        throw new Error("Failed to fetch stock movements");
      }

      if (!inventoryResponse.ok) {
        throw new Error("Failed to fetch inventory units");
      }

      const movementData = await movementResponse.json();
      const inventoryData = await inventoryResponse.json();

      setMovements(Array.isArray(movementData) ? movementData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (err) {
      console.error("Error fetching stock movements:", err);
      setError(err?.message || "Unable to load stock movements");
      setMovements([]);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const inventoryUnitById = useMemo(() => {
    const map = {};
    inventory.forEach((item) => {
      if (item?.id != null) {
        map[String(item.id)] = item.unit || "kg";
      }
    });
    return map;
  }, [inventory]);

  const stockInCount = useMemo(
    () => movements.filter((item) => isStockIn(item.movement_type)).length,
    [movements]
  );

  const stockOutCount = useMemo(
    () => movements.filter((item) => isStockOut(item.movement_type)).length,
    [movements]
  );

  const transferCount = useMemo(
    () => movements.filter((item) => isTransfer(item)).length,
    [movements]
  );

  const filteredMovements = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return movements;

    return movements.filter((item) => {
      return (
        item.movement_type?.toLowerCase().includes(searchText) ||
        item.reference_type?.toLowerCase().includes(searchText) ||
        item.remarks?.toLowerCase().includes(searchText) ||
        String(item.inventory_id ?? "").includes(searchText) ||
        String(item.reference_id ?? "").includes(searchText) ||
        String(item.from_warehouse_id ?? "").includes(searchText) ||
        String(item.to_warehouse_id ?? "").includes(searchText)
      );
    });
  }, [movements, search]);

  const getUnit = (item) => {
    const unit = inventoryUnitById[String(item.inventory_id)];
    if (unit) return unit;

    // Fallback for legacy records if the inventory row is unavailable.
    const remark = String(item.remarks || "");
    const match = remark.match(/\b(kg|meter|meters|m|piece|pieces|pcs)\b/i);
    if (match) {
      const value = match[1].toLowerCase();
      if (value === "meters" || value === "m") return "meter";
      if (value === "pieces" || value === "pcs") return "piece";
      return value;
    }

    return "kg";
  };

  const getMovementBadge = (movementType) => {
    const type = normalizeType(movementType);

    if (type === "stock in" || type === "production output") {
      return (
        <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
          {movementType}
        </span>
      );
    }

    if (type === "stock out" || type === "dispatch out" || type === "quality rejection") {
      return (
        <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700">
          {movementType}
        </span>
      );
    }

    if (type.includes("transfer")) {
      return (
        <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
          {movementType}
        </span>
      );
    }

    if (type === "quality approved") {
      return (
        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
          Quality Approved
        </span>
      );
    }

    return (
      <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
        {movementType || "Unknown"}
      </span>
    );
  };

  const getMovementIcon = (movementType) => {
    const type = normalizeType(movementType);

    if (type === "stock in" || type === "production output") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
          <ArrowDownToLine size={20} className="text-emerald-700" />
        </div>
      );
    }

    if (type === "stock out" || type === "dispatch out" || type === "quality rejection") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
          <ArrowUpFromLine size={20} className="text-red-700" />
        </div>
      );
    }

    if (type.includes("transfer")) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <ArrowRightLeft size={20} className="text-blue-700" />
        </div>
      );
    }

    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <ArrowLeftRight size={20} className="text-slate-700" />
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="px-10 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ArrowLeftRight size={25} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Stock Movements</h1>
                <p className="mt-1 text-slate-600">Track and monitor inventory stock movements</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-base text-slate-600">Total Movements</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{movements.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-base text-slate-600">Stock In</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">{stockInCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-base text-slate-600">Stock Out</p>
            <p className="mt-3 text-3xl font-bold text-red-600">{stockOutCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-base text-slate-600">Transfers</p>
            <p className="mt-3 text-3xl font-bold text-blue-600">{transferCount}</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="relative w-full max-w-xl">
              <Search
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search stock movements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
                    "Movement",
                    "Inventory ID",
                    "Quantity",
                    "Reference",
                    "From Warehouse",
                    "To Warehouse",
                    "Remarks",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                      Loading stock movements...
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                      No stock movements found
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((item) => {
                    const unit = getUnit(item);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getMovementIcon(item.movement_type)}
                            {getMovementBadge(item.movement_type)}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          #{item.inventory_id}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          {Number(item.quantity ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {unit}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.reference_type
                            ? `${item.reference_type} #${item.reference_id ?? ""}`
                            : "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.from_warehouse_id
                            ? `Warehouse #${item.from_warehouse_id}`
                            : "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.to_warehouse_id
                            ? `Warehouse #${item.to_warehouse_id}`
                            : "-"}
                        </td>

                        <td className="max-w-md px-6 py-4 text-slate-600">
                          {item.remarks || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 text-slate-600">
            Showing {filteredMovements.length} of {movements.length} stock movements
          </div>
        </div>
      </div>
    </main>
  );
}
