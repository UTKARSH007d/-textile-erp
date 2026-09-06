"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

const initialQuotationItem = {
  product_id: "",
  description: "",
  quantity: "",
  unit: "meter",
  unit_price: "",
};

const initialOrderItem = {
  product_id: "",
  fabric_id: "",
  yarn_id: "",
  color_id: "",
  quantity: "",
  unit: "meter",
  unit_price: "",
  required_yarn_qty: "",
  required_fabric_qty: "",
};

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState("quotations");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [quotationForm, setQuotationForm] = useState({
    quotation_no: "",
    customer_id: "",
    quotation_date: new Date().toISOString().split("T")[0],
    valid_until: "",
    status: "Draft",
    remarks: "",
    items: [{ ...initialQuotationItem }],
  });

  const [orderForm, setOrderForm] = useState({
    sales_order_no: "",
    customer_id: "",
    quotation_id: "",
    order_date: new Date().toISOString().split("T")[0],
    delivery_date: "",
    status: "Pending",
    remarks: "",
    items: [{ ...initialOrderItem }],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const [
        customersRes,
        productsRes,
        quotationsRes,
        ordersRes,
      ] = await Promise.all([
        apiFetch(`${API_URL}/api/customers/`),
        apiFetch(`${API_URL}/api/products/`),
        apiFetch(`${API_URL}/api/sales/quotations/`),
        apiFetch(`${API_URL}/api/sales/orders/`),
      ]);

      if (customersRes.ok) {
        setCustomers(await customersRes.json());
      }

      if (productsRes.ok) {
        setProducts(await productsRes.json());
      }

      if (quotationsRes.ok) {
        setQuotations(await quotationsRes.json());
      }

      if (ordersRes.ok) {
        setOrders(await ordersRes.json());
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function getCustomerName(customerId) {
    const customer = customers.find(
      (item) => item.id === customerId
    );

    return customer ? customer.name : `Customer #${customerId}`;
  }

  function getProductName(productId) {
    const product = products.find(
      (item) => item.id === productId
    );

    return product
      ? product.name
      : productId
        ? `Product #${productId}`
        : "-";
  }

  // =====================================================
  // QUOTATION FUNCTIONS
  // =====================================================

  function updateQuotationField(field, value) {
    setQuotationForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateQuotationItem(index, field, value) {
    const updatedItems = [...quotationForm.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setQuotationForm((previous) => ({
      ...previous,
      items: updatedItems,
    }));
  }

  function addQuotationItem() {
    setQuotationForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        { ...initialQuotationItem },
      ],
    }));
  }

  function removeQuotationItem(index) {
    if (quotationForm.items.length === 1) {
      return;
    }

    setQuotationForm((previous) => ({
      ...previous,
      items: previous.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function quotationTotal() {
    return quotationForm.items.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 0) *
          (Number(item.unit_price) || 0),
      0
    );
  }

  async function createQuotation(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!quotationForm.customer_id) {
      setError("Please select a customer.");
      return;
    }

    const payload = {
      quotation_no: quotationForm.quotation_no,
      customer_id: Number(quotationForm.customer_id),
      quotation_date: quotationForm.quotation_date,
      valid_until:
        quotationForm.valid_until || null,
      status: quotationForm.status,
      remarks: quotationForm.remarks || null,
      items: quotationForm.items.map((item) => ({
        product_id: item.product_id
          ? Number(item.product_id)
          : null,
        description: item.description || null,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
      })),
    };

    try {
      const response = await apiFetch(
        `${API_URL}/api/sales/quotations/`,
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
          data.detail || "Failed to create quotation"
        );
      }

      showMessage(
        `Quotation ${data.quotation_no} created successfully!`
      );

      setQuotationForm({
        quotation_no: "",
        customer_id: "",
        quotation_date:
          new Date().toISOString().split("T")[0],
        valid_until: "",
        status: "Draft",
        remarks: "",
        items: [{ ...initialQuotationItem }],
      });

      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteQuotation(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quotation?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/api/sales/quotations/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete quotation"
        );
      }

      showMessage(data.message);

      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // =====================================================
  // SALES ORDER FUNCTIONS
  // =====================================================

  function updateOrderField(field, value) {
    setOrderForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateOrderItem(index, field, value) {
    const updatedItems = [...orderForm.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setOrderForm((previous) => ({
      ...previous,
      items: updatedItems,
    }));
  }

  function addOrderItem() {
    setOrderForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        { ...initialOrderItem },
      ],
    }));
  }

  function removeOrderItem(index) {
    if (orderForm.items.length === 1) {
      return;
    }

    setOrderForm((previous) => ({
      ...previous,
      items: previous.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function orderTotal() {
    return orderForm.items.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 0) *
          (Number(item.unit_price) || 0),
      0
    );
  }

  async function createSalesOrder(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!orderForm.customer_id) {
      setError("Please select a customer.");
      return;
    }

    const payload = {
      sales_order_no: orderForm.sales_order_no,
      customer_id: Number(orderForm.customer_id),
      quotation_id: orderForm.quotation_id
        ? Number(orderForm.quotation_id)
        : null,
      order_date: orderForm.order_date,
      delivery_date:
        orderForm.delivery_date || null,
      status: orderForm.status,
      remarks: orderForm.remarks || null,
      items: orderForm.items.map((item) => ({
        product_id: item.product_id
          ? Number(item.product_id)
          : null,
        fabric_id: item.fabric_id
          ? Number(item.fabric_id)
          : null,
        yarn_id: item.yarn_id
          ? Number(item.yarn_id)
          : null,
        color_id: item.color_id
          ? Number(item.color_id)
          : null,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
        required_yarn_qty:
          Number(item.required_yarn_qty) || 0,
        required_fabric_qty:
          Number(item.required_fabric_qty) || 0,
      })),
    };

    try {
      const response = await apiFetch(
        `${API_URL}/api/sales/orders/`,
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
          data.detail || "Failed to create sales order"
        );
      }

      showMessage(
        `Sales Order ${data.sales_order_no} created successfully!`
      );

      setOrderForm({
        sales_order_no: "",
        customer_id: "",
        quotation_id: "",
        order_date:
          new Date().toISOString().split("T")[0],
        delivery_date: "",
        status: "Pending",
        remarks: "",
        items: [{ ...initialOrderItem }],
      });

      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSalesOrder(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this sales order?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/api/sales/orders/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete sales order"
        );
      }

      showMessage(data.message);

      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        Loading Sales Management...
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Sales Management
          </h1>

          <p style={styles.subtitle}>
            Manage quotations and customer sales orders
          </p>
        </div>

        <button
          onClick={loadData}
          style={styles.refreshButton}
        >
          ↻ Refresh
        </button>
      </div>

      {message && (
        <div style={styles.success}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          onClick={() =>
            setActiveTab("quotations")
          }
          style={
            activeTab === "quotations"
              ? styles.activeTab
              : styles.tab
          }
        >
          Quotations
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          style={
            activeTab === "orders"
              ? styles.activeTab
              : styles.tab
          }
        >
          Sales Orders
        </button>
      </div>

      {/* ========================================= */}
      {/* QUOTATIONS */}
      {/* ========================================= */}

      {activeTab === "quotations" && (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              Create New Quotation
            </h2>

            <form onSubmit={createQuotation}>
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>
                    Quotation Number
                  </label>

                  <input
                    required
                    value={
                      quotationForm.quotation_no
                    }
                    onChange={(event) =>
                      updateQuotationField(
                        "quotation_no",
                        event.target.value
                      )
                    }
                    placeholder="QT-001"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Customer
                  </label>

                  <select
                    required
                    value={
                      quotationForm.customer_id
                    }
                    onChange={(event) =>
                      updateQuotationField(
                        "customer_id",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    <option value="">
                      Select Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>
                    Quotation Date
                  </label>

                  <input
                    type="date"
                    required
                    value={
                      quotationForm.quotation_date
                    }
                    onChange={(event) =>
                      updateQuotationField(
                        "quotation_date",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Valid Until
                  </label>

                  <input
                    type="date"
                    value={
                      quotationForm.valid_until
                    }
                    onChange={(event) =>
                      updateQuotationField(
                        "valid_until",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Status
                  </label>

                  <select
                    value={
                      quotationForm.status
                    }
                    onChange={(event) =>
                      updateQuotationField(
                        "status",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    <option value="Draft">
                      Draft
                    </option>

                    <option value="Sent">
                      Sent
                    </option>

                    <option value="Approved">
                      Approved
                    </option>

                    <option value="Rejected">
                      Rejected
                    </option>
                  </select>
                </div>
              </div>

              <div style={styles.itemsSection}>
                <div style={styles.itemsHeader}>
                  <h3 style={styles.itemsTitle}>
                    Quotation Items
                  </h3>

                  <button
                    type="button"
                    onClick={addQuotationItem}
                    style={styles.addButton}
                  >
                    + Add Item
                  </button>
                </div>

                {quotationForm.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      style={styles.itemRow}
                    >
                      <select
                        value={item.product_id}
                        onChange={(event) =>
                          updateQuotationItem(
                            index,
                            "product_id",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      >
                        <option value="">
                          Select Product
                        </option>

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={item.description}
                        onChange={(event) =>
                          updateQuotationItem(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Description"
                        style={styles.input}
                      />

                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          updateQuotationItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        placeholder="Quantity"
                        style={styles.input}
                      />

                      <input
                        value={item.unit}
                        onChange={(event) =>
                          updateQuotationItem(
                            index,
                            "unit",
                            event.target.value
                          )
                        }
                        placeholder="Unit"
                        style={styles.input}
                      />

                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(event) =>
                          updateQuotationItem(
                            index,
                            "unit_price",
                            event.target.value
                          )
                        }
                        placeholder="Unit Price"
                        style={styles.input}
                      />

                      <div style={styles.amountBox}>
                        ₹
                        {(
                          (Number(item.quantity) || 0) *
                          (Number(item.unit_price) || 0)
                        ).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeQuotationItem(index)
                        }
                        style={styles.deleteSmallButton}
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>

              <div>
                <label style={styles.label}>
                  Remarks
                </label>

                <textarea
                  value={quotationForm.remarks}
                  onChange={(event) =>
                    updateQuotationField(
                      "remarks",
                      event.target.value
                    )
                  }
                  placeholder="Additional remarks..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.totalSection}>
                <strong>
                  Total Amount: ₹
                  {quotationTotal().toFixed(2)}
                </strong>

                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              Existing Quotations
            </h2>

            {quotations.length === 0 ? (
              <p>No quotations created yet.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Quotation No.</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {quotations.map(
                      (quotation) => (
                        <tr key={quotation.id}>
                          <td>
                            {quotation.quotation_no}
                          </td>

                          <td>
                            {getCustomerName(
                              quotation.customer_id
                            )}
                          </td>

                          <td>
                            {quotation.quotation_date}
                          </td>

                          <td>
                            {quotation.valid_until ||
                              "-"}
                          </td>

                          <td>
                            <span
                              style={
                                styles.statusBadge
                              }
                            >
                              {quotation.status}
                            </span>
                          </td>

                          <td>
                            ₹
                            {Number(
                              quotation.total_amount
                            ).toFixed(2)}
                          </td>

                          <td>
                            <button
                              onClick={() =>
                                deleteQuotation(
                                  quotation.id
                                )
                              }
                              style={
                                styles.deleteButton
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================= */}
      {/* SALES ORDERS */}
      {/* ========================================= */}

      {activeTab === "orders" && (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              Create Sales Order
            </h2>

            <form onSubmit={createSalesOrder}>
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>
                    Sales Order Number
                  </label>

                  <input
                    required
                    value={
                      orderForm.sales_order_no
                    }
                    onChange={(event) =>
                      updateOrderField(
                        "sales_order_no",
                        event.target.value
                      )
                    }
                    placeholder="SO-001"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Customer
                  </label>

                  <select
                    required
                    value={
                      orderForm.customer_id
                    }
                    onChange={(event) =>
                      updateOrderField(
                        "customer_id",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    <option value="">
                      Select Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>
                    Source Quotation
                  </label>

                  <select
                    value={
                      orderForm.quotation_id
                    }
                    onChange={(event) =>
                      updateOrderField(
                        "quotation_id",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    <option value="">
                      No Quotation
                    </option>

                    {quotations.map(
                      (quotation) => (
                        <option
                          key={quotation.id}
                          value={quotation.id}
                        >
                          {quotation.quotation_no}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>
                    Order Date
                  </label>

                  <input
                    type="date"
                    required
                    value={orderForm.order_date}
                    onChange={(event) =>
                      updateOrderField(
                        "order_date",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Delivery Date
                  </label>

                  <input
                    type="date"
                    value={
                      orderForm.delivery_date
                    }
                    onChange={(event) =>
                      updateOrderField(
                        "delivery_date",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Status
                  </label>

                  <select
                    value={orderForm.status}
                    onChange={(event) =>
                      updateOrderField(
                        "status",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  >
                    <option value="Pending">
                      Pending
                    </option>

                    <option value="Confirmed">
                      Confirmed
                    </option>

                    <option value="In Production">
                      In Production
                    </option>

                    <option value="Completed">
                      Completed
                    </option>
                  </select>
                </div>
              </div>

              <div style={styles.itemsSection}>
                <div style={styles.itemsHeader}>
                  <h3 style={styles.itemsTitle}>
                    Sales Order Items
                  </h3>

                  <button
                    type="button"
                    onClick={addOrderItem}
                    style={styles.addButton}
                  >
                    + Add Item
                  </button>
                </div>

                {orderForm.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      style={styles.orderItem}
                    >
                      <select
                        required
                        value={item.product_id}
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "product_id",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      >
                        <option value="">
                          Select Product
                        </option>

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      />

                      <input
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "unit",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      />

                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "unit_price",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Required Yarn"
                        value={
                          item.required_yarn_qty
                        }
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "required_yarn_qty",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Required Fabric"
                        value={
                          item.required_fabric_qty
                        }
                        onChange={(event) =>
                          updateOrderItem(
                            index,
                            "required_fabric_qty",
                            event.target.value
                          )
                        }
                        style={styles.input}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeOrderItem(index)
                        }
                        style={styles.deleteSmallButton}
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>

              <div>
                <label style={styles.label}>
                  Remarks
                </label>

                <textarea
                  value={orderForm.remarks}
                  onChange={(event) =>
                    updateOrderField(
                      "remarks",
                      event.target.value
                    )
                  }
                  placeholder="Additional remarks..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.totalSection}>
                <strong>
                  Total Amount: ₹
                  {orderTotal().toFixed(2)}
                </strong>

                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  Create Sales Order
                </button>
              </div>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              Existing Sales Orders
            </h2>

            {orders.length === 0 ? (
              <p>No sales orders created yet.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Order No.</th>
                      <th>Customer</th>
                      <th>Order Date</th>
                      <th>Delivery Date</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          {order.sales_order_no}
                        </td>

                        <td>
                          {getCustomerName(
                            order.customer_id
                          )}
                        </td>

                        <td>
                          {order.order_date}
                        </td>

                        <td>
                          {order.delivery_date ||
                            "-"}
                        </td>

                        <td>
                          <span
                            style={
                              styles.statusBadge
                            }
                          >
                            {order.status}
                          </span>
                        </td>

                        <td>
                          ₹
                          {Number(
                            order.total_amount
                          ).toFixed(2)}
                        </td>

                        <td>
                          <button
                            onClick={() =>
                              deleteSalesOrder(
                                order.id
                              )
                            }
                            style={
                              styles.deleteButton
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px",
    color: "#1f2937",
    fontFamily: "Arial, sans-serif",
  },

  loading: {
    padding: "40px",
    fontSize: "18px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    color: "#6b7280",
    marginTop: "8px",
  },

  refreshButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#e5e7eb",
    cursor: "pointer",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "25px",
  },

  tab: {
    padding: "12px 22px",
    border: "none",
    borderRadius: "8px",
    background: "#e5e7eb",
    cursor: "pointer",
    fontWeight: "bold",
  },

  activeTab: {
    padding: "12px 22px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  card: {
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "20px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    boxSizing: "border-box",
    background: "white",
  },

  textarea: {
    width: "100%",
    minHeight: "80px",
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    boxSizing: "border-box",
  },

  itemsSection: {
    marginTop: "25px",
    marginBottom: "20px",
  },

  itemsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  itemsTitle: {
    margin: 0,
  },

  itemRow: {
    display: "grid",
    gridTemplateColumns:
      "1.5fr 1.5fr 1fr 1fr 1fr 1fr auto",
    gap: "10px",
    marginBottom: "10px",
    alignItems: "center",
  },

  orderItem: {
    display: "grid",
    gridTemplateColumns:
      "1.5fr 1fr 1fr 1fr 1fr 1fr auto",
    gap: "10px",
    marginBottom: "10px",
    alignItems: "center",
  },

  amountBox: {
    padding: "10px",
    background: "#f3f4f6",
    borderRadius: "7px",
    textAlign: "center",
    fontWeight: "bold",
  },

  addButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 15px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  deleteSmallButton: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "7px",
    padding: "10px",
    cursor: "pointer",
  },

  totalSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "25px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    fontSize: "18px",
  },

  primaryButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  statusBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "13px",
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};