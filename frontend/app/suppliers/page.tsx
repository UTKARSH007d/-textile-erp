"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
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

type SupplierForm = {
  supplier_code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: boolean;
};

const emptyForm: SupplierForm = {
  supplier_code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  status: true,
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(`${API_URL}/api/suppliers/`);

      if (!response.ok) {
        throw new Error("Failed to load suppliers");
      }

      const data = await response.json();
      setSuppliers(data);
    } catch {
      setError(
        "Unable to connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      supplier_code: supplier.supplier_code,
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      country: supplier.country || "India",
      status: supplier.status,
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField(
    field: keyof SupplierForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSupplier() {
    if (!form.supplier_code.trim()) {
      setError("Supplier code is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingSupplier
        ? `${API_URL}/api/suppliers/${editingSupplier.id}`
        : `${API_URL}/api/suppliers/`;

      const method = editingSupplier ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save supplier"
        );
      }

      closeModal();
      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save supplier"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${supplier.name}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API_URL}/api/suppliers/${supplier.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete supplier"
        );
      }

      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete supplier"
      );
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        supplier.name.toLowerCase().includes(searchText) ||
        supplier.supplier_code
          .toLowerCase()
          .includes(searchText) ||
        (supplier.email || "")
          .toLowerCase()
          .includes(searchText) ||
        (supplier.phone || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && supplier.status) ||
        (statusFilter === "Inactive" && !supplier.status);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const activeCount = suppliers.filter(
    (supplier) => supplier.status
  ).length;

  const inactiveCount = suppliers.length - activeCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Users size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Suppliers
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Manage suppliers and their contact information
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8">
        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Total Suppliers
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {suppliers.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Active Suppliers
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Inactive Suppliers
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-700">
              {inactiveCount}
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
          {/* SEARCH */}
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-6 py-4 font-semibold">
                    Supplier
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Contact
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Location
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
                      colSpan={5}
                      className="px-6 py-16 text-center text-sm text-slate-600"
                    >
                      Loading suppliers...
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
                      <Users
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-black">
                        No suppliers found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Add a supplier or change your search.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* SUPPLIER */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                            {supplier.name
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-black">
                              {supplier.name}
                            </p>

                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              {supplier.supplier_code}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center gap-2 text-sm font-medium text-black">
                              <Mail
                                size={14}
                                className="text-slate-500"
                              />
                              {supplier.email}
                            </div>
                          )}

                          {supplier.phone && (
                            <div className="flex items-center gap-2 text-sm font-medium text-black">
                              <Phone
                                size={14}
                                className="text-slate-500"
                              />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-black">
                          <MapPin
                            size={15}
                            className="text-slate-500"
                          />

                          <span>
                            {supplier.city || "-"}
                            {supplier.state
                              ? `, ${supplier.state}`
                              : ""}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            supplier.status
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {supplier.status
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              openEditModal(supplier)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-black"
                            title="Edit supplier"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() =>
                              deleteSupplier(supplier)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete supplier"
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
              Showing {filteredSuppliers.length} of{" "}
              {suppliers.length} suppliers
            </p>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-black">
                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {editingSupplier
                    ? "Update supplier information"
                    : "Create a new supplier record"}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Supplier Code"
                  required
                  value={form.supplier_code}
                  onChange={(value) =>
                    updateField("supplier_code", value)
                  }
                  placeholder="SUP-002"
                />

                <FormField
                  label="Supplier Name"
                  required
                  value={form.name}
                  onChange={(value) =>
                    updateField("name", value)
                  }
                  placeholder="Supplier company name"
                />

                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    updateField("email", value)
                  }
                  placeholder="sales@company.com"
                />

                <FormField
                  label="Phone"
                  value={form.phone}
                  onChange={(value) =>
                    updateField("phone", value)
                  }
                  placeholder="9876543210"
                />

                <FormField
                  label="City"
                  value={form.city}
                  onChange={(value) =>
                    updateField("city", value)
                  }
                  placeholder="Ludhiana"
                />

                <FormField
                  label="State"
                  value={form.state}
                  onChange={(value) =>
                    updateField("state", value)
                  }
                  placeholder="Punjab"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  rows={3}
                  placeholder="Supplier address"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Country"
                  value={form.country}
                  onChange={(value) =>
                    updateField("country", value)
                  }
                  placeholder="India"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Status
                  </label>

                  <select
                    value={
                      form.status ? "Active" : "Inactive"
                    }
                    onChange={(e) =>
                      updateField(
                        "status",
                        e.target.value === "Active"
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveSupplier}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
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