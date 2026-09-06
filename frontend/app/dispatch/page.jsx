"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Package,
  X,
  Edit,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  // NULL = creating new dispatch
  // OBJECT = editing existing dispatch
  const [editingDispatch, setEditingDispatch] = useState(null);

  const getEmptyForm = () => ({
    dispatch_no: "",
    sales_order_id: "",
    customer_id: "",
    dispatch_date: new Date().toISOString().split("T")[0],
    status: "Pending",
    transporter: "",
    vehicle_no: "",
    tracking_no: "",
    remarks: "",
  });

  const getEmptyItem = () => ({
    product_id: "",
    fabric_id: "",
    quantity: "",
    unit: "meter",
  });

  const [formData, setFormData] = useState(getEmptyForm());

  const [items, setItems] = useState([
    getEmptyItem(),
  ]);

  // =========================================================
  // FETCH ALL DATA
  // =========================================================

  const fetchData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        apiFetch(`${API_URL}/api/dispatch/`),
        apiFetch(`${API_URL}/api/customers/`),
        apiFetch(`${API_URL}/api/sales/orders/`),
        apiFetch(`${API_URL}/api/products/`),
        apiFetch(`${API_URL}/api/fabrics/`),
        apiFetch(`${API_URL}/api/inventory/`),
      ]);

      // DISPATCHES
      if (results[0].status === "fulfilled") {
        const response = results[0].value;

        if (response.ok) {
          const data = await response.json();

          setDispatches(
            Array.isArray(data)
              ? data
              : []
          );
        }
      }

      // CUSTOMERS
      if (results[1].status === "fulfilled") {
        const response = results[1].value;

        if (response.ok) {
          const data = await response.json();

          setCustomers(
            Array.isArray(data)
              ? data
              : []
          );
        }
      }

      // SALES ORDERS
      if (results[2].status === "fulfilled") {
        const response = results[2].value;

        if (response.ok) {
          const data = await response.json();

          setSalesOrders(
            Array.isArray(data)
              ? data
              : []
          );
        }
      }

      // PRODUCTS
      if (results[3].status === "fulfilled") {
        const response = results[3].value;

        if (response.ok) {
          const data = await response.json();

          setProducts(
            Array.isArray(data)
              ? data
              : []
          );
        }
      }

      // FABRICS
      if (results[4].status === "fulfilled") {
        const response = results[4].value;

        if (response.ok) {
          const data = await response.json();

          setFabrics(
            Array.isArray(data)
              ? data
              : []
          );
        }
      }

      // INVENTORY
      // The backend performs the authoritative stock validation and
      // deduction when a dispatch becomes Dispatched/Delivered.
      if (results[5]?.status === "fulfilled") {
        const response = results[5].value;

        if (!response.ok) {
          console.warn("Inventory endpoint returned an error.");
        }
      }
    } catch (error) {
      console.error(
        "Error fetching dispatch data:",
        error
      );

      alert(
        "Unable to load dispatch data. Please check if the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // ITEM CHANGE
  // =========================================================

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    const updatedItems = [...items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // Product and fabric should not both be selected
    if (
      field === "product_id" &&
      value
    ) {
      updatedItems[index].fabric_id = "";

      const selectedProduct = products.find(
        (product) => Number(product.id) === Number(value)
      );

      if (selectedProduct?.unit) {
        updatedItems[index].unit = selectedProduct.unit;
      }
    }

    if (
      field === "fabric_id" &&
      value
    ) {
      updatedItems[index].product_id = "";

      const selectedFabric = fabrics.find(
        (fabric) => Number(fabric.id) === Number(value)
      );

      if (selectedFabric?.unit) {
        updatedItems[index].unit = selectedFabric.unit;
      }
    }

    setItems(updatedItems);
  };

  // =========================================================
  // ADD ITEM
  // =========================================================

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      getEmptyItem(),
    ]);
  };

  // =========================================================
  // REMOVE ITEM
  // =========================================================

  const removeItem = (index) => {
    if (items.length === 1) {
      alert(
        "At least one dispatch item is required."
      );

      return;
    }

    setItems((previous) =>
      previous.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setEditingDispatch(null);

    setFormData(
      getEmptyForm()
    );

    setItems([
      getEmptyItem(),
    ]);
  };

  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeForm = () => {
    setShowForm(false);

    resetForm();
  };

  // =========================================================
  // OPEN CREATE FORM
  // =========================================================

  const openCreateForm = () => {
    resetForm();

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // EDIT DISPATCH
  // =========================================================

  const handleEdit = (dispatch) => {
    setEditingDispatch(dispatch);

    setFormData({
      dispatch_no:
        dispatch.dispatch_no || "",

      sales_order_id:
        dispatch.sales_order_id !== null &&
        dispatch.sales_order_id !== undefined
          ? dispatch.sales_order_id.toString()
          : "",

      customer_id:
        dispatch.customer_id !== null &&
        dispatch.customer_id !== undefined
          ? dispatch.customer_id.toString()
          : "",

      dispatch_date:
        dispatch.dispatch_date || "",

      status:
        dispatch.status || "Pending",

      transporter:
        dispatch.transporter || "",

      vehicle_no:
        dispatch.vehicle_no || "",

      tracking_no:
        dispatch.tracking_no || "",

      remarks:
        dispatch.remarks || "",
    });

    if (
      Array.isArray(dispatch.items) &&
      dispatch.items.length > 0
    ) {
      setItems(
        dispatch.items.map((item) => ({
          product_id:
            item.product_id !== null &&
            item.product_id !== undefined
              ? item.product_id.toString()
              : "",

          fabric_id:
            item.fabric_id !== null &&
            item.fabric_id !== undefined
              ? item.fabric_id.toString()
              : "",

          quantity:
            item.quantity !== null &&
            item.quantity !== undefined
              ? item.quantity.toString()
              : "",

          unit:
            item.unit || "meter",
        }))
      );
    } else {
      setItems([
        getEmptyItem(),
      ]);
    }

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (
      !formData.dispatch_no.trim()
    ) {
      return "Please enter a dispatch number.";
    }

    if (
      !formData.customer_id
    ) {
      return "Please select a customer.";
    }

    if (
      !formData.dispatch_date
    ) {
      return "Please select a dispatch date.";
    }

    if (
      formData.status === "Cancelled"
    ) {
      return "Cancelled dispatches cannot be created or updated with dispatch items.";
    }

    if (
      !items.length
    ) {
      return "At least one dispatch item is required.";
    }

    for (
      let index = 0;
      index < items.length;
      index += 1
    ) {
      const item = items[index];

      if (
        !item.product_id &&
        !item.fabric_id
      ) {
        return `Item ${
          index + 1
        }: Please select a product or fabric.`;
      }

      if (
        item.product_id &&
        item.fabric_id
      ) {
        return `Item ${
          index + 1
        }: Select either product or fabric, not both.`;
      }

      if (
        !item.quantity ||
        Number(item.quantity) <= 0
      ) {
        return `Item ${
          index + 1
        }: Please enter a valid quantity.`;
      }
    }

    return "";
  };

  // =========================================================
  // BUILD PAYLOAD
  // =========================================================

  const buildPayload = () => {
    return {
      dispatch_no:
        formData.dispatch_no.trim(),

      sales_order_id:
        formData.sales_order_id
          ? Number(
              formData.sales_order_id
            )
          : null,

      customer_id:
        Number(
          formData.customer_id
        ),

      dispatch_date:
        formData.dispatch_date,

      status:
        formData.status,

      transporter:
        formData.transporter.trim() || null,

      vehicle_no:
        formData.vehicle_no.trim() || null,

      tracking_no:
        formData.tracking_no.trim() || null,

      remarks:
        formData.remarks.trim() || null,

      items: items.map(
        (item) => ({
          product_id:
            item.product_id
              ? Number(
                  item.product_id
                )
              : null,

          fabric_id:
            item.fabric_id
              ? Number(
                  item.fabric_id
                )
              : null,

          quantity:
            Number(
              item.quantity
            ),

          unit:
            item.unit,
        })
      ),
    };
  };

  // =========================================================
  // CREATE / UPDATE DISPATCH
  // =========================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      alert(validationError);

      return;
    }

    const payload =
      buildPayload();

    try {
      setSaving(true);

      const url =
        editingDispatch
          ? `${API_URL}/api/dispatch/${editingDispatch.id}`
          : `${API_URL}/api/dispatch/`;

      const method =
        editingDispatch
          ? "PUT"
          : "POST";

      const response =
        await apiFetch(url, {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        });

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        console.error(
          "Dispatch save error:",
          data
        );

        alert(
          data?.detail ||
            `Unable to ${
              editingDispatch
                ? "update"
                : "create"
            } dispatch.`
        );

        return;
      }

      alert(
        editingDispatch
          ? "Dispatch updated successfully!"
          : "Dispatch created successfully!"
      );

      await fetchData();

      closeForm();
    } catch (error) {
      console.error(
        "Error saving dispatch:",
        error
      );

      alert(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE DISPATCH
  // =========================================================

  const handleDelete = async (
    dispatchId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this dispatch?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `${API_URL}/api/dispatch/${dispatchId}`,
          {
            method: "DELETE",
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        alert(
          data?.detail ||
            "Unable to delete dispatch."
        );

        return;
      }

      alert(
        "Dispatch deleted successfully!"
      );

      await fetchData();
    } catch (error) {
      console.error(
        "Delete error:",
        error
      );

      alert(
        "Unable to delete dispatch."
      );
    }
  };

  // =========================================================
  // CUSTOMER NAME
  // =========================================================

  const getCustomerName = (
    customerId
  ) => {
    const customer =
      customers.find(
        (item) =>
          Number(item.id) ===
          Number(customerId)
      );

    if (!customer) {
      return `Customer #${customerId}`;
    }

    return (
      customer.name ||
      customer.customer_name ||
      customer.company_name ||
      `Customer #${customerId}`
    );
  };

  // =========================================================
  // FILTERED DISPATCHES
  // =========================================================

  const filteredDispatches =
    dispatches.filter(
      (dispatch) => {
        const searchText =
          search.toLowerCase();

        const customerName =
          getCustomerName(
            dispatch.customer_id
          ).toLowerCase();

        return (
          dispatch.dispatch_no
            ?.toLowerCase()
            .includes(
              searchText
            ) ||
          dispatch.status
            ?.toLowerCase()
            .includes(
              searchText
            ) ||
          customerName.includes(
            searchText
          ) ||
          dispatch.transporter
            ?.toLowerCase()
            .includes(
              searchText
            ) ||
          dispatch.vehicle_no
            ?.toLowerCase()
            .includes(
              searchText
            )
        );
      }
    );

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (
    status
  ) => {
    const normalizedStatus =
      status?.toLowerCase();

    if (
      normalizedStatus ===
      "delivered"
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (
      normalizedStatus ===
      "dispatched"
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (
      normalizedStatus ===
      "cancelled"
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-orange-50 text-orange-700 border-orange-200";
  };

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalDispatches =
    dispatches.length;

  const pendingDispatches =
    dispatches.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "pending"
    ).length;

  const dispatchedCount =
    dispatches.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "dispatched"
    ).length;

  const deliveredDispatches =
    dispatches.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "delivered"
    ).length;

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-6 md:p-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#172238] shadow-sm">
            <Truck className="h-8 w-8 text-white" />
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#1b2a41]">
              Dispatch
            </h1>

            <p className="mt-1 text-lg text-[#4c5f75]">
              Manage product and fabric dispatches
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-[#1b2a41] transition hover:bg-slate-50"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>

          <button
            type="button"
            onClick={
              openCreateForm
            }
            className="flex items-center gap-2 rounded-xl bg-[#172238] px-5 py-3 font-medium text-white transition hover:bg-[#24344f]"
          >
            <Plus className="h-5 w-5" />
            New Dispatch
          </button>
        </div>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-medium text-[#40536a]">
            Total Dispatches
          </p>

          <p className="mt-3 text-4xl font-bold text-[#1b2a41]">
            {totalDispatches}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-medium text-[#40536a]">
            Pending
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-600">
            {pendingDispatches}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-medium text-[#40536a]">
            Dispatched
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-600">
            {dispatchedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-medium text-[#40536a]">
            Delivered
          </p>

          <p className="mt-3 text-4xl font-bold text-green-600">
            {deliveredDispatches}
          </p>
        </div>
      </div>

      {/* =====================================================
          CREATE / EDIT FORM
      ===================================================== */}

      {showForm && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1b2a41]">
                {editingDispatch
                  ? "Edit Dispatch"
                  : "Create New Dispatch"}
              </h2>

              <p className="mt-1 text-[#5b6b7e]">
                {editingDispatch
                  ? "Update dispatch details and items"
                  : "Enter dispatch details and add dispatch items"}
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="p-6"
          >
            {/* BASIC DETAILS */}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* DISPATCH NUMBER */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Dispatch Number *
                </label>

                <input
                  type="text"
                  name="dispatch_no"
                  value={
                    formData.dispatch_no
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="DISP-001"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                />
              </div>

              {/* DATE */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Dispatch Date *
                </label>

                <input
                  type="date"
                  name="dispatch_date"
                  value={
                    formData.dispatch_date
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                />
              </div>

              {/* CUSTOMER */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Customer *
                </label>

                <select
                  name="customer_id"
                  value={
                    formData.customer_id
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                >
                  <option value="">
                    Select Customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {customer.name ||
                          customer.customer_name ||
                          customer.company_name ||
                          `Customer #${customer.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SALES ORDER */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Sales Order
                </label>

                <select
                  name="sales_order_id"
                  value={
                    formData.sales_order_id
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                >
                  <option value="">
                    Select Sales Order
                  </option>

                  {salesOrders.map(
                    (order) => (
                      <option
                        key={order.id}
                        value={order.id}
                      >
                        {order.sales_order_no ||
                          order.order_no ||
                          `Sales Order #${order.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Status
                </label>

                <select
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Dispatched">
                    Dispatched
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* TRANSPORTER */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Transporter
                </label>

                <input
                  type="text"
                  name="transporter"
                  value={
                    formData.transporter
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="ABC Transport"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                />
              </div>

              {/* VEHICLE */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Vehicle Number
                </label>

                <input
                  type="text"
                  name="vehicle_no"
                  value={
                    formData.vehicle_no
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="DL01AB1234"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                />
              </div>

              {/* TRACKING */}

              <div>
                <label className="mb-2 block font-medium text-[#1b2a41]">
                  Tracking Number
                </label>

                <input
                  type="text"
                  name="tracking_no"
                  value={
                    formData.tracking_no
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="TRACK-001"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
                />
              </div>
            </div>

            {/* =================================================
                DISPATCH ITEMS
            ================================================= */}

            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1b2a41]">
                    Dispatch Items
                  </h3>

                  <p className="mt-1 text-sm text-[#5b6b7e]">
                    Select either a product or fabric
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addItem
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#315fbd] px-5 py-3 font-medium text-white transition hover:bg-[#274d9c]"
                >
                  <Plus className="h-5 w-5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-[#fafbfc] p-5"
                    >
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                        {/* PRODUCT */}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#1b2a41]">
                            Product
                          </label>

                          <select
                            value={
                              item.product_id
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                "product_id",
                                event.target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#1b2a41] outline-none focus:border-[#315fbd]"
                          >
                            <option value="">
                              Select Product
                            </option>

                            {products.map(
                              (
                                product
                              ) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {product.name ||
                                    product.product_name ||
                                    product.product_code ||
                                    `Product #${product.id}`}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {/* FABRIC */}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#1b2a41]">
                            Fabric
                          </label>

                          <select
                            value={
                              item.fabric_id
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                "fabric_id",
                                event.target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#1b2a41] outline-none focus:border-[#315fbd]"
                          >
                            <option value="">
                              Select Fabric
                            </option>

                            {fabrics.map(
                              (
                                fabric
                              ) => (
                                <option
                                  key={
                                    fabric.id
                                  }
                                  value={
                                    fabric.id
                                  }
                                >
                                  {fabric.name ||
                                    fabric.fabric_name ||
                                    fabric.fabric_code ||
                                    `Fabric #${fabric.id}`}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {/* QUANTITY */}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#1b2a41]">
                            Quantity *
                          </label>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                "quantity",
                                event.target
                                  .value
                              )
                            }
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#1b2a41] outline-none focus:border-[#315fbd]"
                          />
                        </div>

                        {/* UNIT */}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#1b2a41]">
                            Unit
                          </label>

                          <select
                            value={
                              item.unit
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                "unit",
                                event.target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#1b2a41] outline-none focus:border-[#315fbd]"
                          >
                            <option value="kg">
                              kg
                            </option>

                            <option value="meter">
                              meter
                            </option>

                            <option value="piece">
                              piece
                            </option>

                            <option value="roll">
                              roll
                            </option>
                          </select>
                        </div>

                        {/* REMOVE */}

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-5 w-5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* REMARKS */}

            <div className="mt-6">
              <label className="mb-2 block font-medium text-[#1b2a41]">
                Remarks
              </label>

              <textarea
                name="remarks"
                value={
                  formData.remarks
                }
                onChange={
                  handleChange
                }
                rows={4}
                placeholder="Enter any additional remarks..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
              />
            </div>

            {/* ACTIONS */}

            <div className="mt-8 flex flex-col justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-[#1b2a41] transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#172238] px-6 py-3 font-medium text-white transition hover:bg-[#24344f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingDispatch
                    ? "Updating Dispatch..."
                    : "Creating Dispatch..."
                  : editingDispatch
                  ? "Update Dispatch"
                  : "Create Dispatch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          DISPATCH LIST
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1b2a41]">
              Dispatch Records
            </h2>

            <p className="mt-1 text-[#5b6b7e]">
              Track and manage all dispatch records
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search dispatch, customer or transporter..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-[#1b2a41] outline-none transition focus:border-[#315fbd]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-lg text-slate-500">
            Loading dispatch records...
          </div>
        ) : filteredDispatches.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Package className="mb-4 h-12 w-12 text-slate-400" />

            <h3 className="text-xl font-semibold text-[#1b2a41]">
              No dispatches found
            </h3>

            <p className="mt-2 text-slate-500">
              Create your first dispatch to get started.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Dispatch
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Date
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Customer
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Transporter
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Vehicle
                    </th>

                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Status
                    </th>

                    <th className="px-6 py-5 text-center text-sm font-bold uppercase tracking-wide text-[#40536a]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDispatches.map(
                    (
                      dispatch
                    ) => (
                      <tr
                        key={
                          dispatch.id
                        }
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5 font-semibold text-[#1b2a41]">
                          {
                            dispatch.dispatch_no
                          }
                        </td>

                        <td className="px-6 py-5 text-[#334155]">
                          {
                            dispatch.dispatch_date
                          }
                        </td>

                        <td className="px-6 py-5 text-[#334155]">
                          {getCustomerName(
                            dispatch.customer_id
                          )}
                        </td>

                        <td className="px-6 py-5 text-[#334155]">
                          {dispatch.transporter ||
                            "-"}
                        </td>

                        <td className="px-6 py-5 text-[#334155]">
                          {dispatch.vehicle_no ||
                            "-"}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-medium ${getStatusStyle(
                              dispatch.status
                            )}`}
                          >
                            {
                              dispatch.status
                            }
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-center gap-2">
                            {/* EDIT BUTTON */}

                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  dispatch
                                )
                              }
                              className="rounded-lg border border-slate-300 p-2.5 text-[#334155] transition hover:bg-slate-100"
                              title="Edit Dispatch"
                            >
                              <Edit className="h-5 w-5" />
                            </button>

                            {/* DELETE BUTTON */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  dispatch.id
                                )
                              }
                              className="rounded-lg border border-red-200 p-2.5 text-red-600 transition hover:bg-red-50"
                              title="Delete Dispatch"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 text-[#40536a]">
              Showing{" "}
              {
                filteredDispatches.length
              }{" "}
              of{" "}
              {
                dispatches.length
              }{" "}
              dispatches
            </div>
          </>
        )}
      </div>
    </main>
  );
}