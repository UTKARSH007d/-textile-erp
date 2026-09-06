"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ShoppingCart,
  Pencil,
  Trash2,
  X,
  Calendar,
  Building2,
  IndianRupee,
} from "lucide-react";

const API_URL = "http://localhost:8000";

type Supplier = {
  id: number;
  supplier_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  status: boolean;
};

type PurchaseOrder = {
  id: number;
  purchase_order_no: string;
  supplier_id: number;
  order_date: string;
  expected_date: string | null;
  status: string;
  total_amount: number;
  remarks: string | null;
};

type PurchaseItem = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type PurchaseForm = {
  purchase_order_no: string;
  supplier_id: string;
  order_date: string;
  expected_date: string;
  status: string;
  remarks: string;
  items: PurchaseItem[];
};

const emptyItem: PurchaseItem = {
  description: "",
  quantity: "",
  unit: "kg",
  unit_price: "",
};

const emptyForm: PurchaseForm = {
  purchase_order_no: "",
  supplier_id: "",
  order_date: new Date().toISOString().split("T")[0],
  expected_date: "",
  status: "Pending",
  remarks: "",
  items: [{ ...emptyItem }],
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<PurchaseOrder | null>(null);

  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
    loadSuppliers();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${API_URL}/api/purchase-orders/`
      );

      if (!response.ok) {
        throw new Error("Failed to load purchase orders");
      }

      const data = await response.json();
      setOrders(data);
    } catch {
      setError(
        "Unable to connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      const response = await apiFetch(
        `${API_URL}/api/suppliers/`
      );

      if (!response.ok) {
        throw new Error("Failed to load suppliers");
      }

      const data = await response.json();
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    }
  }

  function openAddModal() {
    setEditingOrder(null);

    setForm({
      ...emptyForm,
      purchase_order_no: `PO-${String(
        orders.length + 1
      ).padStart(4, "0")}`,
      items: [{ ...emptyItem }],
    });

    setError("");
    setShowModal(true);
  }

  function openEditModal(order: PurchaseOrder) {
    setEditingOrder(order);

    setForm({
      purchase_order_no: order.purchase_order_no,
      supplier_id: String(order.supplier_id),
      order_date: order.order_date,
      expected_date: order.expected_date || "",
      status: order.status,
      remarks: order.remarks || "",
      items: [{ ...emptyItem }],
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingOrder(null);
    setForm(emptyForm);
    setError("");
  }

  function updateForm(
    field: keyof PurchaseForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          ...emptyItem,
        },
      ],
    }));
  }

  function removeItem(index: number) {
    if (form.items.length === 1) return;

    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  const formTotal = form.items.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    return total + quantity * unitPrice;
  }, 0);

  async function saveOrder() {
    if (!form.purchase_order_no.trim()) {
      setError("Purchase order number is required.");
      return;
    }

    if (!form.supplier_id.trim()) {
      setError("Supplier is required.");
      return;
    }

    if (!form.order_date) {
      setError("Order date is required.");
      return;
    }

    if (form.items.length === 0) {
      setError("Add at least one item.");
      return;
    }

    for (const item of form.items) {
      if (!item.description.trim()) {
        setError("Every item needs a description.");
        return;
      }

      if (
        !item.quantity ||
        Number(item.quantity) <= 0
      ) {
        setError("Quantity must be greater than zero.");
        return;
      }

      if (
        item.unit_price === "" ||
        Number(item.unit_price) < 0
      ) {
        setError("Enter a valid unit price.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        purchase_order_no: form.purchase_order_no,
        supplier_id: Number(form.supplier_id),
        order_date: form.order_date,
        expected_date:
          form.expected_date || null,
        status: form.status,
        remarks: form.remarks || null,

        items: form.items.map((item) => ({
          yarn_id: null,
          fabric_id: null,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
        })),
      };

      const url = editingOrder
        ? `${API_URL}/api/purchase-orders/${editingOrder.id}`
        : `${API_URL}/api/purchase-orders/`;

      const method = editingOrder ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save purchase order"
        );
      }

      closeModal();
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save purchase order"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: PurchaseOrder) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${order.purchase_order_no}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API_URL}/api/purchase-orders/${order.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete purchase order"
        );
      }

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete purchase order"
      );
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchText = search.toLowerCase().trim();

      const supplier = suppliers.find(
        (item) => item.id === order.supplier_id
      );

      const supplierName = supplier?.name || "";
      const supplierCode = supplier?.supplier_code || "";

      const matchesSearch =
        order.purchase_order_no
          .toLowerCase()
          .includes(searchText) ||
        String(order.supplier_id).includes(searchText) ||
        supplierName.toLowerCase().includes(searchText) ||
        supplierCode.toLowerCase().includes(searchText) ||
        (order.remarks || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, suppliers, search, statusFilter]);

  const pendingCount = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const completedCount = orders.filter(
    (order) =>
      order.status === "Completed" ||
      order.status === "Received"
  ).length;

  const totalValue = orders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
    0
  );

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShoppingCart size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Purchase Orders
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Manage supplier purchase orders and material purchases
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            New Purchase Order
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8">
        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Total Purchase Orders
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {orders.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Pending Orders
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Completed Orders
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {completedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Total Purchase Value
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        {error && !showModal && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                placeholder="Search purchase orders..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-black placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-6 py-4 font-semibold">
                    Purchase Order
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Supplier
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Order Date
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Expected
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Amount
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-sm text-slate-600"
                    >
                      Loading purchase orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <ShoppingCart
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-black">
                        No purchase orders found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Create your first purchase order.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            <ShoppingCart size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-black">
                              {order.purchase_order_no}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              PO ID #{order.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-black">
                          <Building2
                            size={16}
                            className="text-slate-500"
                          />

                          {suppliers.find(
                            (supplier) =>
                              supplier.id === order.supplier_id
                          )?.name || `Supplier #${order.supplier_id}`}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-black">
                          <Calendar
                            size={15}
                            className="text-slate-500"
                          />

                          {formatDate(order.order_date)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-black">
                        {formatDate(order.expected_date)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm font-bold text-black">
                          <IndianRupee size={14} />
                          {Number(
                            order.total_amount
                          ).toLocaleString("en-IN")}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            order.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : order.status === "Completed" ||
                                  order.status === "Received"
                                ? "bg-emerald-50 text-emerald-700"
                                : order.status === "Cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              openEditModal(order)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-black"
                            title="Edit purchase order"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() =>
                              deleteOrder(order)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete purchase order"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
            <p className="text-xs font-medium text-slate-600">
              Showing {filteredOrders.length} of{" "}
              {orders.length} purchase orders
            </p>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-black">
                  {editingOrder
                    ? "Edit Purchase Order"
                    : "New Purchase Order"}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Create a supplier purchase order
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* PO DETAILS */}
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                  Purchase Order Details
                </h3>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    label="Purchase Order No."
                    required
                    value={form.purchase_order_no}
                    onChange={(value) =>
                      updateForm(
                        "purchase_order_no",
                        value
                      )
                    }
                    placeholder="PO-0002"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      Supplier
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      value={form.supplier_id}
                      onChange={(e) =>
                        updateForm("supplier_id", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="">Select supplier</option>

                      {suppliers
                        .filter((supplier) => supplier.status)
                        .map((supplier) => (
                          <option
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.name} ({supplier.supplier_code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <FormField
                    label="Order Date"
                    required
                    value={form.order_date}
                    onChange={(value) =>
                      updateForm("order_date", value)
                    }
                    type="date"
                  />

                  <FormField
                    label="Expected Date"
                    value={form.expected_date}
                    onChange={(value) =>
                      updateForm(
                        "expected_date",
                        value
                      )
                    }
                    type="date"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="Pending">
                        Pending
                      </option>
                      <option value="Approved">
                        Approved
                      </option>
                      <option value="Completed">
                        Completed
                      </option>
                      <option value="Cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ITEMS */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Order Items
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Add yarn or fabric materials to this order.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {form.items.map((item, index) => {
                    const amount =
                      (Number(item.quantity) || 0) *
                      (Number(item.unit_price) || 0);

                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-bold text-black">
                            Item {index + 1}
                          </p>

                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(index)
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-black">
                              Description *
                            </label>

                            <input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Cotton Yarn 40s"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Quantity *
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="500"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Unit
                            </label>

                            <select
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "unit",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="kg">
                                kg
                              </option>
                              <option value="meter">
                                meter
                              </option>
                              <option value="m">
                                m
                              </option>
                              <option value="piece">
                                piece
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Unit Price *
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "unit_price",
                                  e.target.value
                                )
                              }
                              placeholder="250"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Amount
                            </label>

                            <div className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-black">
                              ₹
                              {amount.toLocaleString(
                                "en-IN"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TOTAL */}
                <div className="mt-4 flex items-center justify-end rounded-xl bg-slate-900 px-5 py-4 text-white">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-300">
                      Estimated Total
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatCurrency(formTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* REMARKS */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Remarks
                </label>

                <textarea
                  value={form.remarks}
                  onChange={(e) =>
                    updateForm(
                      "remarks",
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Additional notes about this purchase order"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveOrder}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingOrder
                    ? "Update Purchase Order"
                    : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-black">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}