"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const emptyForm = {
    invoice_no: "",
    sales_order_id: "",
    customer_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    subtotal: "",
    tax_amount: "",
    total_amount: "",
    status: "Unpaid",
    remarks: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  // =========================================================
  // FETCH DATA
  // =========================================================

  const fetchAllData = async () => {
    setLoading(true);

    try {
      const results = await Promise.allSettled([
        apiFetch(`${API_URL}/api/finance/invoices`),
        apiFetch(`${API_URL}/api/customers/`),
        apiFetch(`${API_URL}/api/sales/orders/`),
      ]);

      if (
        results[0].status === "fulfilled" &&
        results[0].value.ok
      ) {
        const data = await results[0].value.json();
        setInvoices(Array.isArray(data) ? data : []);
      }

      if (
        results[1].status === "fulfilled" &&
        results[1].value.ok
      ) {
        const data = await results[1].value.json();
        setCustomers(Array.isArray(data) ? data : []);
      }

      if (
        results[2].status === "fulfilled" &&
        results[2].value.ok
      ) {
        const data = await results[2].value.json();
        setSalesOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading invoice data:", error);
      alert("Failed to load invoice data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const generateInvoiceNumber = () => {
    const nextNumber = invoices.length + 1;

    return `INV-${String(nextNumber).padStart(3, "0")}`;
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(
      (item) => item.id === Number(customerId)
    );

    if (!customer) return "-";

    return (
      customer.customer_name ||
      customer.name ||
      customer.company_name ||
      `Customer #${customerId}`
    );
  };

  const getSalesOrderNumber = (salesOrderId) => {
    if (!salesOrderId) return "-";

    const order = salesOrders.find(
      (item) => item.id === Number(salesOrderId)
    );

    if (!order) return `Order #${salesOrderId}`;

    return (
      order.sales_order_no ||
      order.order_no ||
      `Order #${salesOrderId}`
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredInvoices = invoices.filter((invoice) => {
    const search = searchTerm.toLowerCase();

    const customerName = getCustomerName(
      invoice.customer_id
    ).toLowerCase();

    return (
      invoice.invoice_no?.toLowerCase().includes(search) ||
      invoice.status?.toLowerCase().includes(search) ||
      customerName.includes(search)
    );
  });

  // =========================================================
  // MODAL
  // =========================================================

  const openAddModal = () => {
    setEditingInvoice(null);

    setFormData({
      ...emptyForm,
      invoice_no: generateInvoiceNumber(),
    });

    setShowModal(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);

    setFormData({
      invoice_no: invoice.invoice_no || "",
      sales_order_id: invoice.sales_order_id
        ? String(invoice.sales_order_id)
        : "",
      customer_id: invoice.customer_id
        ? String(invoice.customer_id)
        : "",
      invoice_date: invoice.invoice_date || "",
      due_date: invoice.due_date || "",
      subtotal: invoice.subtotal ?? "",
      tax_amount: invoice.tax_amount ?? "",
      total_amount: invoice.total_amount ?? "",
      status: invoice.status || "Unpaid",
      remarks: invoice.remarks || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingInvoice(null);
    setFormData(emptyForm);
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // AUTO CALCULATE TOTAL
  // =========================================================

  const updateAmount = (field, value) => {
    setFormData((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      const subtotal = Number(
        field === "subtotal"
          ? value
          : previous.subtotal
      );

      const taxAmount = Number(
        field === "tax_amount"
          ? value
          : previous.tax_amount
      );

      updated.total_amount = subtotal + taxAmount;

      return updated;
    });
  };

  // =========================================================
  // SAVE INVOICE
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoice_no.trim()) {
      alert("Please enter an invoice number.");
      return;
    }

    if (!formData.customer_id) {
      alert("Please select a customer.");
      return;
    }

    if (!formData.invoice_date) {
      alert("Please select an invoice date.");
      return;
    }

    const payload = {
      invoice_no: formData.invoice_no.trim(),
      sales_order_id: formData.sales_order_id
        ? Number(formData.sales_order_id)
        : null,
      customer_id: Number(formData.customer_id),
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      subtotal: Number(formData.subtotal || 0),
      tax_amount: Number(formData.tax_amount || 0),
      total_amount: Number(formData.total_amount || 0),
      status: formData.status,
      remarks: formData.remarks.trim() || null,
    };

    try {
      setSaving(true);

      const url = editingInvoice
        ? `${API_URL}/api/finance/invoices/${editingInvoice.id}`
        : `${API_URL}/api/finance/invoices`;

      const method = editingInvoice ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to save invoice."
        );
      }

      alert(
        editingInvoice
          ? "Invoice updated successfully."
          : "Invoice created successfully."
      );

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert(error.message || "Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (invoice) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${invoice.invoice_no}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API_URL}/api/finance/invoices/${invoice.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to delete invoice."
        );
      }

      alert("Invoice deleted successfully.");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert(error.message || "Failed to delete invoice.");
    }
  };

  // =========================================================
  // STATUS BADGE
  // =========================================================

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return {
          background: "#dcfce7",
          color: "#15803d",
          border: "#86efac",
        };

      case "partial":
      case "partially paid":
        return {
          background: "#fef3c7",
          color: "#b45309",
          border: "#fde68a",
        };

      case "overdue":
        return {
          background: "#fee2e2",
          color: "#dc2626",
          border: "#fecaca",
        };

      default:
        return {
          background: "#fef2f2",
          color: "#b91c1c",
          border: "#fecaca",
        };
    }
  };

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalInvoices = invoices.length;

  const unpaidInvoices = invoices.filter(
    (invoice) =>
      invoice.status?.toLowerCase() === "unpaid"
  ).length;

  const paidInvoices = invoices.filter(
    (invoice) =>
      invoice.status?.toLowerCase() === "paid"
  ).length;

  const totalInvoiceAmount = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.total_amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 shadow-sm">
            <FileText
              size={38}
              className="text-white"
            />
          </div>

          <div>
            <h1 className="text-4xl font-bold text-slate-800">
              Invoices
            </h1>

            <p className="mt-1 text-lg text-slate-500">
              Manage customer invoices and payment status
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-slate-700 transition hover:bg-gray-100"
          >
            <RefreshCw size={20} />
            Refresh
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-white transition hover:bg-slate-700"
          >
            <Plus size={21} />
            New Invoice
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-slate-500">
                Total Invoices
              </p>

              <p className="mt-3 text-4xl font-bold text-slate-800">
                {totalInvoices}
              </p>
            </div>

            <FileText
              size={32}
              className="text-blue-600"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-slate-500">
                Unpaid
              </p>

              <p className="mt-3 text-4xl font-bold text-red-600">
                {unpaidInvoices}
              </p>
            </div>

            <AlertCircle
              size={32}
              className="text-red-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-slate-500">
                Paid
              </p>

              <p className="mt-3 text-4xl font-bold text-green-600">
                {paidInvoices}
              </p>
            </div>

            <CheckCircle2
              size={32}
              className="text-green-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-slate-500">
                Total Amount
              </p>

              <p className="mt-3 text-2xl font-bold text-slate-800">
                {formatCurrency(totalInvoiceAmount)}
              </p>
            </div>

            <IndianRupee
              size={32}
              className="text-purple-600"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Invoice Records
            </h2>

            <p className="mt-1 text-slate-500">
              Track and manage all customer invoices
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Loading invoices...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Invoice
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Customer
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Sales Order
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Invoice Date
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Due Date
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Amount
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase text-slate-600">
                      Status
                    </th>

                    <th className="px-6 py-5 text-center text-sm font-semibold uppercase text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-16 text-center text-slate-500"
                      >
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const statusStyle =
                        getStatusStyle(invoice.status);

                      return (
                        <tr
                          key={invoice.id}
                          className="border-b transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5 font-semibold text-slate-800">
                            {invoice.invoice_no}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {getCustomerName(
                              invoice.customer_id
                            )}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {getSalesOrderNumber(
                              invoice.sales_order_id
                            )}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {invoice.invoice_date || "-"}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {invoice.due_date || "-"}
                          </td>

                          <td className="px-6 py-5 font-semibold text-slate-800">
                            {formatCurrency(
                              invoice.total_amount
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className="inline-flex rounded-full border px-4 py-2 text-sm font-medium"
                              style={{
                                backgroundColor:
                                  statusStyle.background,
                                color: statusStyle.color,
                                borderColor:
                                  statusStyle.border,
                              }}
                            >
                              {invoice.status}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() =>
                                  openEditModal(invoice)
                                }
                                className="rounded-xl border border-gray-300 p-3 text-slate-700 transition hover:bg-slate-100"
                                title="Edit Invoice"
                              >
                                <Pencil size={19} />
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(invoice)
                                }
                                className="rounded-xl border border-red-200 p-3 text-red-600 transition hover:bg-red-50"
                                title="Delete Invoice"
                              >
                                <Trash2 size={19} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-5 text-slate-500">
              Showing {filteredInvoices.length} of{" "}
              {invoices.length} invoices
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingInvoice
                    ? "Edit Invoice"
                    : "Create New Invoice"}
                </h2>

                <p className="mt-1 text-slate-600">
                  Enter the invoice details below
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-900 transition hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

                {/* Invoice Number */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Invoice Number
                  </label>

                  <input
                    type="text"
                    name="invoice_no"
                    value={formData.invoice_no}
                    onChange={handleChange}
                    placeholder="INV-001"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Customer */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Customer
                  </label>

                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">
                      Select Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                        className="text-black"
                      >
                        {customer.customer_name ||
                          customer.name ||
                          customer.company_name ||
                          `Customer #${customer.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sales Order */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Sales Order{" "}
                    <span className="text-slate-500">
                      (Optional)
                    </span>
                  </label>

                  <select
                    name="sales_order_id"
                    value={formData.sales_order_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">
                      No Sales Order
                    </option>

                    {salesOrders.map((order) => (
                      <option
                        key={order.id}
                        value={order.id}
                        className="text-black"
                      >
                        {order.sales_order_no ||
                          order.order_no ||
                          `Order #${order.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Status
                  </label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="Unpaid">
                      Unpaid
                    </option>

                    <option value="Partial">
                      Partial
                    </option>

                    <option value="Paid">
                      Paid
                    </option>

                    <option value="Overdue">
                      Overdue
                    </option>
                  </select>
                </div>

                {/* Invoice Date */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Invoice Date
                  </label>

                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Due Date */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Due Date
                  </label>

                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Subtotal */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Subtotal
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) =>
                      updateAmount(
                        "subtotal",
                        e.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Tax Amount */}

                <div>
                  <label className="mb-2 block font-medium text-slate-900">
                    Tax Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) =>
                      updateAmount(
                        "tax_amount",
                        e.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Total Amount */}

                <div className="md:col-span-2">
                  <label className="mb-2 block font-medium text-slate-900">
                    Total Amount
                  </label>

                  <input
                    type="number"
                    value={formData.total_amount}
                    readOnly
                    className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3 font-semibold text-slate-950 outline-none"
                  />
                </div>

                {/* Remarks */}

                <div className="md:col-span-2">
                  <label className="mb-2 block font-medium text-slate-900">
                    Remarks
                  </label>

                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Enter remarks..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t p-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-slate-900 transition hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-800 px-6 py-3 text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingInvoice
                    ? "Update Invoice"
                    : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}