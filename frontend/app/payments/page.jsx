"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  IndianRupee,
  Landmark,
  Wallet,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formData, setFormData] = useState({
    payment_no: "",
    invoice_id: "",
    customer_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_method: "Bank Transfer",
    reference_no: "",
    remarks: "",
  });

  // =========================
  // FETCH DATA
  // =========================

  const fetchData = async () => {
    try {
      setLoading(true);

      const [paymentsResponse, invoicesResponse, customersResponse] =
        await Promise.all([
          apiFetch(`${API_URL}/api/finance/payments`),
          apiFetch(`${API_URL}/api/finance/invoices`),
          apiFetch(`${API_URL}/api/customers`).catch(() => null),
        ]);

      const paymentsData = await paymentsResponse.json();
      const invoicesData = await invoicesResponse.json();

      let customersData = [];

      if (customersResponse && customersResponse.ok) {
        customersData = await customersResponse.json();
      }

      setPayments(
        Array.isArray(paymentsData)
          ? paymentsData
          : paymentsData.data || []
      );

      setInvoices(
        Array.isArray(invoicesData)
          ? invoicesData
          : invoicesData.data || []
      );

      setCustomers(
        Array.isArray(customersData)
          ? customersData
          : customersData.data || []
      );
    } catch (error) {
      console.error("Error loading payment data:", error);
      alert("Error loading payment data. Please check the backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =========================
  // CUSTOMER NAME
  // =========================

  const getCustomerName = (customerId) => {
    const customer = customers.find(
      (item) => Number(item.id) === Number(customerId)
    );

    if (customer) {
      return (
        customer.customer_name ||
        customer.name ||
        customer.company_name ||
        `Customer ID: ${customerId}`
      );
    }

    return `Customer ID: ${customerId}`;
  };

  // =========================
  // INVOICE DETAILS
  // =========================

  const getInvoice = (invoiceId) => {
    return invoices.find(
      (invoice) => Number(invoice.id) === Number(invoiceId)
    );
  };

  // =========================
  // CALCULATE PAYMENT DETAILS
  // =========================

  const paymentRecords = useMemo(() => {
    return payments.map((payment) => {
      const invoice = getInvoice(payment.invoice_id);

      const invoiceTotal = Number(
        invoice?.total_amount ||
          invoice?.total ||
          invoice?.amount ||
          0
      );

      /*
        Calculate ALL payments for this invoice.
        This is the important fix.
      */

      const totalPaid = payments
        .filter(
          (item) =>
            Number(item.invoice_id) === Number(payment.invoice_id)
        )
        .reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

      const remaining = Math.max(
        invoiceTotal - totalPaid,
        0
      );

      /*
        Calculate correct status dynamically
      */

      let invoiceStatus = "Unpaid";

      if (invoiceTotal > 0 && totalPaid >= invoiceTotal) {
        invoiceStatus = "Paid";
      } else if (totalPaid > 0 && totalPaid < invoiceTotal) {
        invoiceStatus = "Partial";
      }

      return {
        ...payment,

        invoice,
        invoice_no:
          invoice?.invoice_no ||
          invoice?.invoice_number ||
          `Invoice ID: ${payment.invoice_id}`,

        customer_name: getCustomerName(
          payment.customer_id ||
            invoice?.customer_id
        ),

        invoice_total: invoiceTotal,
        total_paid: totalPaid,
        remaining,
        invoice_status: invoiceStatus,
      };
    });
  }, [payments, invoices, customers]);

  // =========================
  // SEARCH
  // =========================

  const filteredPayments = paymentRecords.filter((payment) => {
    const searchText = search.toLowerCase();

    return (
      String(payment.payment_no || "")
        .toLowerCase()
        .includes(searchText) ||
      String(payment.invoice_no || "")
        .toLowerCase()
        .includes(searchText) ||
      String(payment.customer_name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(payment.reference_no || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  // =========================
  // STATISTICS
  // =========================

  const statistics = useMemo(() => {
    const totalPayments = payments.length;

    const totalAmount = payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const bankTransfers = payments.filter(
      (payment) =>
        payment.payment_method === "Bank Transfer"
    ).length;

    const otherMethods = payments.filter(
      (payment) =>
        payment.payment_method !== "Bank Transfer"
    ).length;

    return {
      totalPayments,
      totalAmount,
      bankTransfers,
      otherMethods,
    };
  }, [payments]);

  // =========================
  // FORMAT CURRENCY
  // =========================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  // =========================
  // NEW PAYMENT NUMBER
  // =========================

  const generatePaymentNumber = () => {
    if (!payments.length) {
      return "PAY-001";
    }

    const numbers = payments
      .map((payment) => {
        const match = String(payment.payment_no || "").match(/\d+/);

        return match ? Number(match[0]) : 0;
      })
      .filter(Boolean);

    const nextNumber =
      Math.max(...numbers, 0) + 1;

    return `PAY-${String(nextNumber).padStart(3, "0")}`;
  };

  // =========================
  // OPEN NEW PAYMENT
  // =========================

  const handleNewPayment = () => {
    setEditingPayment(null);

    setFormData({
      payment_no: generatePaymentNumber(),
      invoice_id: "",
      customer_id: "",
      payment_date: new Date()
        .toISOString()
        .split("T")[0],
      amount: "",
      payment_method: "Bank Transfer",
      reference_no: "",
      remarks: "",
    });

    setShowModal(true);
  };

  // =========================
  // OPEN EDIT PAYMENT
  // =========================

  const handleEdit = (payment) => {
    setEditingPayment(payment);

    setFormData({
      payment_no: payment.payment_no || "",
      invoice_id: String(payment.invoice_id || ""),
      customer_id: String(payment.customer_id || ""),
      payment_date: payment.payment_date || "",
      amount: String(payment.amount || ""),
      payment_method:
        payment.payment_method || "Bank Transfer",
      reference_no: payment.reference_no || "",
      remarks: payment.remarks || "",
    });

    setShowModal(true);
  };

  // =========================
  // INVOICE CHANGE
  // =========================

  const handleInvoiceChange = (invoiceId) => {
    const selectedInvoice = getInvoice(invoiceId);

    setFormData((previous) => ({
      ...previous,
      invoice_id: invoiceId,
      customer_id:
        selectedInvoice?.customer_id
          ? String(selectedInvoice.customer_id)
          : previous.customer_id,
      amount: "",
    }));
  };

  // =========================
  // SAVE PAYMENT
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (!formData.invoice_id) {
        alert("Please select an invoice.");
        return;
      }

      if (
        !formData.amount ||
        Number(formData.amount) <= 0
      ) {
        alert("Please enter a valid payment amount.");
        return;
      }

      const selectedInvoice = getInvoice(formData.invoice_id);

      if (!selectedInvoice) {
        alert("Selected invoice could not be found.");
        return;
      }

      const invoiceTotal = Number(
        selectedInvoice.total_amount ||
          selectedInvoice.total ||
          selectedInvoice.amount ||
          0
      );

      const alreadyPaid = payments
        .filter(
          (item) =>
            Number(item.invoice_id) ===
              Number(formData.invoice_id) &&
            (!editingPayment ||
              item.id !== editingPayment.id)
        )
        .reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

      const remainingBalance = Math.max(
        invoiceTotal - alreadyPaid,
        0
      );

      if (Number(formData.amount) > remainingBalance + 0.01) {
        alert(
          `Payment amount cannot exceed the remaining balance of ${formatCurrency(
            remainingBalance
          )}.`
        );
        return;
      }

      const payload = {
        payment_no: formData.payment_no,
        invoice_id: Number(formData.invoice_id),
        customer_id: Number(formData.customer_id),
        payment_date: formData.payment_date,
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        reference_no: formData.reference_no,
        remarks: formData.remarks,
      };

      let response;

      if (editingPayment) {
        response = await apiFetch(
          `${API_URL}/api/finance/payments/${editingPayment.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch(
          `${API_URL}/api/finance/payments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Unable to save payment."
        );
      }

      setShowModal(false);
      setEditingPayment(null);

      await fetchData();

      alert(
        editingPayment
          ? "Payment updated successfully."
          : "Payment created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        error.message ||
          "Error saving payment."
      );
    }
  };

  // =========================
  // DELETE PAYMENT
  // =========================

  const handleDelete = async (payment) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${payment.payment_no}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/api/finance/payments/${payment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result.detail ||
            "Unable to delete payment."
        );
      }

      await fetchData();

      alert("Payment deleted successfully.");
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Error deleting payment."
      );
    }
  };

  // =========================
  // STATUS BADGE
  // =========================

  const getStatusClass = (status) => {
    if (status === "Paid") {
      return "status-paid";
    }

    if (status === "Partial") {
      return "status-partial";
    }

    return "status-unpaid";
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="payments-page">
      <div className="page-header">
        <div className="page-title-section">
          <div className="page-icon">
            <CreditCard size={38} />
          </div>

          <div>
            <h1>Payments</h1>

            <p>
              Manage customer payments and
              transactions
            </p>
          </div>
        </div>

        <div className="page-actions">
          <button
            className="refresh-btn"
            onClick={fetchData}
          >
            <RefreshCw size={21} />
            Refresh
          </button>

          <button
            className="new-payment-btn"
            onClick={handleNewPayment}
          >
            <Plus size={22} />
            New Payment
          </button>
        </div>
      </div>

      {/* ================= STATS ================= */}

      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p>Total Payments</p>

            <h2>
              {statistics.totalPayments}
            </h2>
          </div>

          <CreditCard
            size={36}
            className="blue-icon"
          />
        </div>

        <div className="stat-card">
          <div>
            <p>Total Amount</p>

            <h2>
              {formatCurrency(
                statistics.totalAmount
              )}
            </h2>
          </div>

          <IndianRupee
            size={36}
            className="purple-icon"
          />
        </div>

        <div className="stat-card">
          <div>
            <p>Bank Transfer</p>

            <h2>
              {statistics.bankTransfers}
            </h2>
          </div>

          <Landmark
            size={36}
            className="green-icon"
          />
        </div>

        <div className="stat-card">
          <div>
            <p>Other Methods</p>

            <h2>
              {statistics.otherMethods}
            </h2>
          </div>

          <Wallet
            size={36}
            className="orange-icon"
          />
        </div>
      </div>

      {/* ================= TABLE ================= */}

      <div className="payment-table-card">
        <div className="table-header">
          <div>
            <h2>Payment Records</h2>

            <p>
              Track payments, invoice balances
              and payment status
            </p>
          </div>

          <div className="search-box">
            <Search size={22} />

            <input
              type="text"
              placeholder="Search payment, invoice or reference..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>INVOICE</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>INVOICE TOTAL</th>
                <th>THIS PAYMENT</th>
                <th>TOTAL PAID</th>
                <th>REMAINING</th>
                <th>INVOICE STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="empty-row"
                  >
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="empty-row"
                  >
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(
                  (payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="invoice-cell">
                          <strong>
                            {payment.invoice_no}
                          </strong>

                          <span>
                            {
                              payment.payment_method
                            }
                          </span>
                        </div>
                      </td>

                      <td>
                        {payment.customer_name}
                      </td>

                      <td>
                        {payment.payment_date}
                      </td>

                      <td>
                        {formatCurrency(
                          payment.invoice_total
                        )}
                      </td>

                      <td className="this-payment">
                        {formatCurrency(
                          payment.amount
                        )}
                      </td>

                      <td className="total-paid">
                        {formatCurrency(
                          payment.total_paid
                        )}
                      </td>

                      <td
                        className={
                          payment.remaining === 0
                            ? "remaining-zero"
                            : "remaining-amount"
                        }
                      >
                        {formatCurrency(
                          payment.remaining
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            payment.invoice_status
                          )}`}
                        >
                          {
                            payment.invoice_status
                          }
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            onClick={() =>
                              handleEdit(payment)
                            }
                          >
                            <Pencil size={20} />
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(payment)
                            }
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Showing {filteredPayments.length} of{" "}
          {payments.length} payments
        </div>
      </div>

      {/* ================= MODAL ================= */}

      {showModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingPayment
                    ? "Edit Payment"
                    : "Create New Payment"}
                </h2>

                <p>
                  Enter payment transaction details
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() =>
                  setShowModal(false)
                }
              >
                <X size={28} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="payment-form"
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Payment Number
                  </label>

                  <input
                    type="text"
                    value={
                      formData.payment_no
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        payment_no:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Invoice</label>

                  <select
                    value={
                      formData.invoice_id
                    }
                    onChange={(event) =>
                      handleInvoiceChange(
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Invoice
                    </option>

                    {invoices.map(
                      (invoice) => (
                        <option
                          key={invoice.id}
                          value={invoice.id}
                        >
                          {invoice.invoice_no ||
                            invoice.invoice_number}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Payment Date
                  </label>

                  <input
                    type="date"
                    value={
                      formData.payment_date
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        payment_date:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>

                  <input
                    type="number"
                    min="0"
                    max={
                      formData.invoice_id
                        ? Math.max(
                            (
                              getInvoice(formData.invoice_id)
                                ?.total_amount || 0
                            ) -
                              payments
                                .filter(
                                  (item) =>
                                    Number(item.invoice_id) ===
                                    Number(formData.invoice_id) &&
                                    (!editingPayment ||
                                      item.id !== editingPayment.id)
                                )
                                .reduce(
                                  (sum, item) =>
                                    sum + Number(item.amount || 0),
                                  0
                                ),
                            0
                          )
                        : undefined
                    }
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        amount:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Payment Method
                  </label>

                  <select
                    value={
                      formData.payment_method
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        payment_method:
                          event.target.value,
                      })
                    }
                  >
                    <option>
                      Bank Transfer
                    </option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Reference Number
                  </label>

                  <input
                    type="text"
                    value={
                      formData.reference_no
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        reference_no:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Remarks</label>

                <textarea
                  rows="4"
                  value={formData.remarks}
                  placeholder="Enter payment remarks..."
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      remarks:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  {editingPayment
                    ? "Update Payment"
                    : "Create Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STYLES ================= */}

      <style jsx>{`
        .payments-page {
          padding: 36px;
          min-height: 100vh;
          background: #f8fafc;
          color: #1e293b;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 34px;
        }

        .page-title-section {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .page-icon {
          width: 96px;
          height: 96px;
          border-radius: 26px;
          background: #243248;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        h1 {
          font-size: 42px;
          margin: 0;
          font-weight: 700;
        }

        .page-title-section p {
          margin: 8px 0 0;
          font-size: 20px;
          color: #64748b;
        }

        .page-actions {
          display: flex;
          gap: 14px;
        }

        button {
          cursor: pointer;
          font-family: inherit;
        }

        .refresh-btn,
        .new-payment-btn {
          height: 62px;
          padding: 0 28px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
        }

        .refresh-btn {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .new-payment-btn {
          border: none;
          background: #243248;
          color: white;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
          margin-bottom: 36px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 32px;
          min-height: 110px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-card p {
          margin: 0 0 20px;
          color: #64748b;
          font-size: 18px;
        }

        .stat-card h2 {
          margin: 0;
          font-size: 34px;
        }

        .blue-icon {
          color: #2563eb;
        }

        .purple-icon {
          color: #7c3aed;
        }

        .green-icon {
          color: #15803d;
        }

        .orange-icon {
          color: #ea580c;
        }

        .payment-table-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          overflow: hidden;
        }

        .table-header {
          padding: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-header h2 {
          margin: 0;
          font-size: 30px;
        }

        .table-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 17px;
        }

        .search-box {
          width: 460px;
          height: 64px;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          color: #64748b;
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 18px;
          background: transparent;
          color: #1e293b;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1450px;
          border-collapse: collapse;
        }

        th {
          background: #f8fafc;
          text-align: left;
          padding: 22px 30px;
          font-size: 15px;
          color: #475569;
        }

        td {
          padding: 24px 30px;
          border-top: 1px solid #e2e8f0;
          color: #475569;
          font-size: 17px;
          white-space: nowrap;
        }

        .invoice-cell {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .invoice-cell strong {
          color: #1e293b;
        }

        .invoice-cell span {
          font-size: 14px;
          color: #64748b;
        }

        .this-payment {
          font-weight: 600;
          color: #1e293b;
        }

        .total-paid {
          color: #15803d;
          font-weight: 600;
        }

        .remaining-amount {
          color: #ea580c;
          font-weight: 600;
        }

        .remaining-zero {
          color: #15803d;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 16px;
        }

        .status-paid {
          color: #15803d;
          background: #ecfdf5;
          border: 1px solid #86efac;
        }

        .status-partial {
          color: #a16207;
          background: #fffbeb;
          border: 1px solid #fcd34d;
        }

        .status-unpaid {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .edit-btn,
        .delete-btn {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-btn {
          border: 1px solid #cbd5e1;
          color: #475569;
        }

        .delete-btn {
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .table-footer {
          padding: 24px 32px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 17px;
        }

        .empty-row {
          text-align: center;
          padding: 50px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .payment-modal {
          width: min(1100px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 30px 36px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 30px;
        }

        .modal-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 17px;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: #64748b;
        }

        .payment-form {
          padding: 36px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 26px 30px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          font-size: 18px;
          color: #334155;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          padding: 16px 20px;
          font-size: 18px;
          outline: none;
          color: #1e293b;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #243248;
        }

        .full-width {
          margin-top: 26px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 14px;
          margin-top: 30px;
        }

        .cancel-btn,
        .save-btn {
          padding: 16px 28px;
          border-radius: 14px;
          font-size: 17px;
        }

        .cancel-btn {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
        }

        .save-btn {
          border: none;
          background: #243248;
          color: white;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .table-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }

          .search-box {
            width: 100%;
            box-sizing: border-box;
          }
        }

        @media (max-width: 700px) {
          .payments-page {
            padding: 20px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 22px;
          }

          .page-actions {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}