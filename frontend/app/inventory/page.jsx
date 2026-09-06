"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Warehouse,
  AlertTriangle,
} from "lucide-react";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        "http://localhost:8000/api/inventory/"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Available quantity
  const getAvailableQuantity = (item) => {
    return item.quantity - item.reserved_quantity;
  };

  // Low stock items
  const lowStockItems = inventory.filter((item) => {
    const available = getAvailableQuantity(item);

    // Only consider it low stock if reorder level is greater than 0
    return (
      item.reorder_level > 0 &&
      available <= item.reorder_level
    );
  });

  // Search
  const filteredInventory = inventory.filter((item) => {
    const materialName = item.yarn_id
      ? `Yarn #${item.yarn_id}`
      : item.fabric_id
      ? `Fabric #${item.fabric_id}`
      : item.product_id
      ? `Product #${item.product_id}`
      : "Unknown";

    const warehouseName = `Warehouse #${item.warehouse_id}`;

    return (
      materialName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      warehouseName
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const getMaterialName = (item) => {
    if (item.yarn_id) {
      return `Yarn #${item.yarn_id}`;
    }

    if (item.fabric_id) {
      return `Fabric #${item.fabric_id}`;
    }

    if (item.product_id) {
      return `Product #${item.product_id}`;
    }

    return "Unknown Material";
  };

  const getStatus = (item) => {
    const available = getAvailableQuantity(item);

    if (
      item.reorder_level > 0 &&
      available <= item.reorder_level
    ) {
      return "Low Stock";
    }

    return "In Stock";
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* PAGE HEADER */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-10 py-6">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Package size={25} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Inventory
              </h1>

              <p className="mt-1 text-slate-600">
                Manage and monitor material inventory
              </p>
            </div>

          </div>

        </div>
      </div>

      <div className="px-10 py-10">

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* TOTAL INVENTORY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

            <p className="text-lg text-slate-600">
              Total Inventory Records
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {inventory.length}
            </p>

          </div>

          {/* LOW STOCK */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-lg text-slate-600">
                  Low Stock Items
                </p>

                <p
                  className={`mt-3 text-3xl font-bold ${
                    lowStockItems.length > 0
                      ? "text-orange-600"
                      : "text-slate-900"
                  }`}
                >
                  {lowStockItems.length}
                </p>
              </div>

              {lowStockItems.length > 0 && (
                <AlertTriangle
                  size={34}
                  className="text-orange-500"
                />
              )}

            </div>

          </div>

        </div>

        {/* INVENTORY TABLE */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* SEARCH */}
          <div className="border-b border-slate-200 p-6">

            <div className="relative w-full max-w-lg">

              <Search
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>
                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Material
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Warehouse
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Quantity
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Reserved
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Available
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Reorder Level
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-slate-700">
                    Status
                  </th>
                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Loading inventory...
                    </td>
                  </tr>

                ) : filteredInventory.length === 0 ? (

                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No inventory records found
                    </td>
                  </tr>

                ) : (

                  filteredInventory.map((item) => {
                    const available =
                      getAvailableQuantity(item);

                    const status =
                      getStatus(item);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50"
                      >

                        {/* MATERIAL */}
                        <td className="px-6 py-5 font-medium text-slate-900">
                          {getMaterialName(item)}
                        </td>

                        {/* WAREHOUSE */}
                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2 text-slate-700">

                            <Warehouse
                              size={20}
                              className="text-slate-500"
                            />

                            Warehouse #{item.warehouse_id}

                          </div>

                        </td>

                        {/* QUANTITY */}
                        <td className="px-6 py-5 text-slate-900">
                          {item.quantity} {item.unit}
                        </td>

                        {/* RESERVED */}
                        <td className="px-6 py-5 text-slate-900">
                          {item.reserved_quantity} {item.unit}
                        </td>

                        {/* AVAILABLE */}
                        <td className="px-6 py-5 font-medium text-slate-900">
                          {available} {item.unit}
                        </td>

                        {/* REORDER LEVEL */}
                        <td className="px-6 py-5 text-slate-900">
                          {item.reorder_level} {item.unit}
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-5">

                          {status === "Low Stock" ? (

                            <span className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700">
                              Low Stock
                            </span>

                          ) : (

                            <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
                              In Stock
                            </span>

                          )}

                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

          {/* FOOTER */}
          <div className="border-t border-slate-200 px-6 py-4 text-slate-600">

            Showing {filteredInventory.length} of{" "}
            {inventory.length} inventory records

          </div>

        </div>

      </div>

    </main>
  );
}