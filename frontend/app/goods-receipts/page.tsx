"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  PackageCheck,
  Pencil,
  Trash2,
  X,
  Calendar,
  Warehouse,
  FileText,
} from "lucide-react";

const API_URL = "http://localhost:8000";

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

type Yarn = {
  id: number;
  yarn_code: string;
  name: string;
  yarn_type: string | null;
  count: string | null;
  unit: string;
  status: boolean;
};

type Fabric = {
  id: number;
  fabric_code: string;
  name: string;
  fabric_type: string | null;
  composition: string | null;
  width: number | null;
  unit: string;
  status: boolean;
};

type WarehouseType = {
  id: number;
  warehouse_code: string;
  name: string;
  location: string | null;
  warehouse_type: string | null;
  status: boolean;
};

type GoodsReceipt = {
  id: number;
  receipt_no: string;
  purchase_order_id: number;
  receipt_date: string;
  status: string;
  remarks: string | null;
};

type ReceiptItem = {
  material_type: "yarn" | "fabric";
  yarn_id: string;
  fabric_id: string;
  received_quantity: string;
  unit: string;
  warehouse_id: string;
};

type ReceiptForm = {
  receipt_no: string;
  purchase_order_id: string;
  receipt_date: string;
  status: string;
  remarks: string;
  items: ReceiptItem[];
};

const emptyItem: ReceiptItem = {
  material_type: "yarn",
  yarn_id: "",
  fabric_id: "",
  received_quantity: "",
  unit: "kg",
  warehouse_id: "",
};

const emptyForm: ReceiptForm = {
  receipt_no: "",
  purchase_order_id: "",
  receipt_date: new Date().toISOString().split("T")[0],
  status: "Received",
  remarks: "",
  items: [{ ...emptyItem }],
};

export default function GoodsReceiptsPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ReceiptForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReceipts();
    loadPurchaseOrders();
    loadYarns();
    loadFabrics();
    loadWarehouses();
  }, []);

  async function loadReceipts() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${API_URL}/api/goods-receipts/`
      );

      if (!response.ok) {
        throw new Error("Failed to load goods receipts");
      }

      const data = await response.json();
      setReceipts(data);
    } catch {
      setError(
        "Unable to connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPurchaseOrders() {
    try {
      const response = await apiFetch(
        `${API_URL}/api/purchase-orders/`
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setPurchaseOrders(data);
    } catch {
      setPurchaseOrders([]);
    }
  }

  async function loadYarns() {
    try {
      const response = await apiFetch(`${API_URL}/api/yarns/`);

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setYarns(data);
    } catch {
      setYarns([]);
    }
  }

  async function loadFabrics() {
    try {
      const response = await apiFetch(`${API_URL}/api/fabrics/`);

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setFabrics(data);
    } catch {
      setFabrics([]);
    }
  }

  async function loadWarehouses() {
    try {
      const response = await apiFetch(
        `${API_URL}/api/warehouses/`
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setWarehouses(data);
    } catch {
      setWarehouses([]);
    }
  }

  function openAddModal() {
    setForm({
      ...emptyForm,
      receipt_no: `GR-${String(
        receipts.length + 1
      ).padStart(4, "0")}`,
      receipt_date: new Date()
        .toISOString()
        .split("T")[0],
      items: [{ ...emptyItem }],
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(emptyForm);
    setError("");
  }

  function updateForm(
    field: keyof ReceiptForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(
    index: number,
    field: keyof ReceiptItem,
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

  function changeMaterialType(
    index: number,
    type: "yarn" | "fabric"
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              material_type: type,
              yarn_id: "",
              fabric_id: "",
              unit: type === "yarn" ? "kg" : "meter",
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

  async function saveReceipt() {
    if (!form.receipt_no.trim()) {
      setError("Receipt number is required.");
      return;
    }

    if (!form.purchase_order_id) {
      setError("Purchase order is required.");
      return;
    }

    if (!form.receipt_date) {
      setError("Receipt date is required.");
      return;
    }

    if (form.items.length === 0) {
      setError("Add at least one receipt item.");
      return;
    }

    for (const item of form.items) {
      if (item.material_type === "yarn" && !item.yarn_id) {
        setError("Select a yarn for every yarn item.");
        return;
      }

      if (
        item.material_type === "fabric" &&
        !item.fabric_id
      ) {
        setError("Select a fabric for every fabric item.");
        return;
      }

      if (
        !item.received_quantity ||
        Number(item.received_quantity) <= 0
      ) {
        setError(
          "Received quantity must be greater than zero."
        );
        return;
      }

      if (!item.warehouse_id) {
        setError("Select a warehouse for every item.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        receipt_no: form.receipt_no,
        purchase_order_id: Number(
          form.purchase_order_id
        ),
        receipt_date: form.receipt_date,
        status: form.status,
        remarks: form.remarks || null,

        items: form.items.map((item) => ({
          yarn_id:
            item.material_type === "yarn"
              ? Number(item.yarn_id)
              : null,

          fabric_id:
            item.material_type === "fabric"
              ? Number(item.fabric_id)
              : null,

          received_quantity: Number(
            item.received_quantity
          ),

          unit: item.unit,

          warehouse_id: Number(
            item.warehouse_id
          ),
        })),
      };

      const response = await apiFetch(
        `${API_URL}/api/goods-receipts/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to create goods receipt"
        );
      }

      closeModal();
      await loadReceipts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create goods receipt"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const searchText = search
        .toLowerCase()
        .trim();

      const purchaseOrder =
        purchaseOrders.find(
          (po) =>
            po.id === receipt.purchase_order_id
        );

      const purchaseOrderNo =
        purchaseOrder?.purchase_order_no || "";

      const matchesSearch =
        receipt.receipt_no
          .toLowerCase()
          .includes(searchText) ||
        purchaseOrderNo
          .toLowerCase()
          .includes(searchText) ||
        String(receipt.purchase_order_id).includes(
          searchText
        ) ||
        (receipt.remarks || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    receipts,
    purchaseOrders,
    search,
    statusFilter,
  ]);

  const receivedCount = receipts.filter(
    (receipt) => receipt.status === "Received"
  ).length;

  const pendingCount = receipts.filter(
    (receipt) => receipt.status === "Pending"
  ).length;

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
              <PackageCheck size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Goods Receipts
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Record received materials against purchase orders
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            New Goods Receipt
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8">

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Total Goods Receipts
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {receipts.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Received
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {receivedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {pendingCount}
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
                placeholder="Search goods receipts..."
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
              <option value="All">
                All Status
              </option>

              <option value="Received">
                Received
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-left">

              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">

                  <th className="px-6 py-4 font-semibold">
                    Receipt
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Purchase Order
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Receipt Date
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Remarks
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
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-slate-600"
                    >
                      Loading goods receipts...
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center"
                    >
                      <PackageCheck
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-black">
                        No goods receipts found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Create your first goods receipt.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map(
                    (receipt) => {

                      const purchaseOrder =
                        purchaseOrders.find(
                          (po) =>
                            po.id ===
                            receipt.purchase_order_id
                        );

                      return (
                        <tr
                          key={receipt.id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                <PackageCheck size={18} />
                              </div>

                              <div>
                                <p className="font-semibold text-black">
                                  {receipt.receipt_no}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  GR ID #{receipt.id}
                                </p>
                              </div>

                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2 text-sm font-medium text-black">
                              <FileText
                                size={16}
                                className="text-slate-500"
                              />

                              {purchaseOrder?.purchase_order_no ||
                                `PO #${receipt.purchase_order_id}`}
                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2 text-sm font-medium text-black">

                              <Calendar
                                size={15}
                                className="text-slate-500"
                              />

                              {formatDate(
                                receipt.receipt_date
                              )}

                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                receipt.status ===
                                "Received"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : receipt.status ===
                                    "Pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : receipt.status ===
                                    "Cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {receipt.status}
                            </span>

                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {receipt.remarks || "-"}
                          </td>

                          <td className="px-6 py-4">

                            <div className="flex justify-end gap-2">

                              <button
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-black"
                                title="View receipt"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                title="Delete receipt"
                              >
                                <Trash2 size={17} />
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">

            <p className="text-xs font-medium text-slate-600">
              Showing {filteredReceipts.length} of{" "}
              {receipts.length} goods receipts
            </p>

          </div>

        </div>

      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-lg font-bold text-black">
                  New Goods Receipt
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Record materials received against a purchase order
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

              {/* RECEIPT DETAILS */}
              <div>

                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                  Receipt Details
                </h3>

                <div className="grid gap-5 md:grid-cols-2">

                  <FormField
                    label="Receipt No."
                    required
                    value={form.receipt_no}
                    onChange={(value) =>
                      updateForm(
                        "receipt_no",
                        value
                      )
                    }
                    placeholder="GR-0001"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      Purchase Order
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={
                        form.purchase_order_id
                      }
                      onChange={(e) =>
                        updateForm(
                          "purchase_order_id",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >

                      <option value="">
                        Select purchase order
                      </option>

                      {purchaseOrders.map(
                        (order) => (
                          <option
                            key={order.id}
                            value={order.id}
                          >
                            {order.purchase_order_no}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <FormField
                    label="Receipt Date"
                    required
                    value={form.receipt_date}
                    onChange={(value) =>
                      updateForm(
                        "receipt_date",
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
                      <option value="Received">
                        Received
                      </option>

                      <option value="Pending">
                        Pending
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
                      Received Items
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Select the material and warehouse where it was received.
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

                  {form.items.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >

                        <div className="mb-4 flex items-center justify-between">

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

                        <div className="grid gap-4 md:grid-cols-2">

                          {/* MATERIAL TYPE */}
                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Material Type
                            </label>

                            <select
                              value={
                                item.material_type
                              }
                              onChange={(e) =>
                                changeMaterialType(
                                  index,
                                  e.target
                                    .value as
                                    | "yarn"
                                    | "fabric"
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="yarn">
                                Yarn
                              </option>

                              <option value="fabric">
                                Fabric
                              </option>
                            </select>
                          </div>

                          {/* MATERIAL */}
                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              {item.material_type ===
                              "yarn"
                                ? "Yarn"
                                : "Fabric"}

                              <span className="ml-1 text-red-500">
                                *
                              </span>
                            </label>

                            <select
                              value={
                                item.material_type ===
                                "yarn"
                                  ? item.yarn_id
                                  : item.fabric_id
                              }
                              onChange={(e) => {
                                if (
                                  item.material_type ===
                                  "yarn"
                                ) {
                                  updateItem(
                                    index,
                                    "yarn_id",
                                    e.target.value
                                  );
                                } else {
                                  updateItem(
                                    index,
                                    "fabric_id",
                                    e.target.value
                                  );
                                }
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            >

                              <option value="">
                                Select{" "}
                                {item.material_type ===
                                "yarn"
                                  ? "yarn"
                                  : "fabric"}
                              </option>

                              {item.material_type ===
                              "yarn"
                                ? yarns
                                    .filter(
                                      (yarn) =>
                                        yarn.status
                                    )
                                    .map(
                                      (yarn) => (
                                        <option
                                          key={
                                            yarn.id
                                          }
                                          value={
                                            yarn.id
                                          }
                                        >
                                          {yarn.name}{" "}
                                          (
                                          {
                                            yarn.yarn_code
                                          }
                                          )
                                        </option>
                                      )
                                    )
                                : fabrics
                                    .filter(
                                      (fabric) =>
                                        fabric.status
                                    )
                                    .map(
                                      (fabric) => (
                                        <option
                                          key={
                                            fabric.id
                                          }
                                          value={
                                            fabric.id
                                          }
                                        >
                                          {fabric.name}{" "}
                                          (
                                          {
                                            fabric.fabric_code
                                          }
                                          )
                                        </option>
                                      )
                                    )}

                            </select>
                          </div>

                          {/* QUANTITY */}
                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Received Quantity
                              <span className="ml-1 text-red-500">
                                *
                              </span>
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.received_quantity
                              }
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "received_quantity",
                                  e.target.value
                                )
                              }
                              placeholder="500"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          </div>

                          {/* UNIT */}
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

                          {/* WAREHOUSE */}
                          <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-medium text-black">
                              Warehouse
                              <span className="ml-1 text-red-500">
                                *
                              </span>
                            </label>

                            <div className="relative">

                              <Warehouse
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                              />

                              <select
                                value={
                                  item.warehouse_id
                                }
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "warehouse_id",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                              >

                                <option value="">
                                  Select warehouse
                                </option>

                                {warehouses
                                  .filter(
                                    (warehouse) =>
                                      warehouse.status
                                  )
                                  .map(
                                    (
                                      warehouse
                                    ) => (
                                      <option
                                        key={
                                          warehouse.id
                                        }
                                        value={
                                          warehouse.id
                                        }
                                      >
                                        {
                                          warehouse.name
                                        }{" "}
                                        (
                                        {
                                          warehouse.warehouse_code
                                        }
                                        )
                                      </option>
                                    )
                                  )}

                              </select>

                            </div>

                          </div>

                        </div>

                      </div>
                    )
                  )}

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
                  placeholder="Additional notes about this receipt"
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
                onClick={saveReceipt}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Create Goods Receipt"}
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
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />

    </div>
  );
}