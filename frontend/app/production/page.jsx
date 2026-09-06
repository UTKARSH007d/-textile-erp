"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";
import {
  Factory,
  Search,
  ClipboardList,
  Plus,
  X,
  Pencil,
  Eye,
  Trash2,
  PlusCircle,
  Trash,
  RefreshCw,
  Package,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

const createEmptyProductionItem = () => ({
  yarn_id: "",
  fabric_id: "",
  planned_quantity: "",
  consumed_quantity: "0",
  unit: "kg",
  status: "Pending",
});

const createInitialFormData = () => ({
  production_order_no: "",
  sales_order_id: "",
  product_id: "",
  warehouse_id: "",
  planned_quantity: "",
  start_date: "",
  expected_completion_date: "",
  actual_completion_date: "",
  status: "Planned",
  remarks: "",
  items: [createEmptyProductionItem()],
});

export default function ProductionPage() {
  const [productionOrders, setProductionOrders] = useState([]);

  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [yarns, setYarns] = useState([]);
  const [fabrics, setFabrics] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [statusData, setStatusData] = useState({
    status: "Planned",
    produced_quantity: "",
    actual_completion_date: "",
  });

  const [showItemsModal, setShowItemsModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewItems, setViewItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");

  const [formData, setFormData] = useState(
    createInitialFormData()
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchProductionOrders(),
      fetchMasterData(),
    ]);
  };

  const fetchProductionOrders = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/production/`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch production orders"
        );
      }

      const data = await response.json();
      setProductionOrders(data);
    } catch (error) {
      console.error(
        "Error fetching production orders:",
        error
      );

      setProductionOrders([]);
      setPageError(
        error.message ||
          "Unable to load production orders."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      setMasterLoading(true);
      setPageError("");

      const [
        salesOrdersResponse,
        productsResponse,
        warehousesResponse,
        yarnsResponse,
        fabricsResponse,
      ] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/sales/orders/`),
        apiFetch(`${API_BASE_URL}/api/products/`),
        apiFetch(`${API_BASE_URL}/api/warehouses/`),
        apiFetch(`${API_BASE_URL}/api/yarns/`),
        apiFetch(`${API_BASE_URL}/api/fabrics/`),
      ]);

      const responses = [
        salesOrdersResponse,
        productsResponse,
        warehousesResponse,
        yarnsResponse,
        fabricsResponse,
      ];

      const failedResponse = responses.find(
        (response) => !response.ok
      );

      if (failedResponse) {
        throw new Error(
          "Failed to load required dropdown data."
        );
      }

      const [
        salesOrdersData,
        productsData,
        warehousesData,
        yarnsData,
        fabricsData,
      ] = await Promise.all(
        responses.map((response) => response.json())
      );

      setSalesOrders(salesOrdersData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setYarns(yarnsData);
      setFabrics(fabricsData);
    } catch (error) {
      console.error(
        "Error fetching master data:",
        error
      );

      setPageError(
        error.message ||
          "Unable to load dropdown data."
      );
    } finally {
      setMasterLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const getActiveRecords = (records) => {
    return records.filter(
      (record) => record.status !== false
    );
  };

  const activeProducts = getActiveRecords(products);
  const activeWarehouses =
    getActiveRecords(warehouses);
  const activeYarns = getActiveRecords(yarns);
  const activeFabrics = getActiveRecords(fabrics);

  const getProductName = (productId) => {
    if (!productId) return "-";

    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) {
      return `Product #${productId}`;
    }

    return `${product.product_code} - ${product.name}`;
  };

  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return "-";

    const warehouse = warehouses.find(
      (item) => item.id === warehouseId
    );

    if (!warehouse) {
      return `Warehouse #${warehouseId}`;
    }

    return `${warehouse.warehouse_code} - ${warehouse.name}`;
  };

  const getYarnName = (yarnId) => {
    if (!yarnId) return "-";

    const yarn = yarns.find(
      (item) => item.id === yarnId
    );

    if (!yarn) {
      return `Yarn #${yarnId}`;
    }

    return `${yarn.yarn_code} - ${yarn.name}`;
  };

  const getFabricName = (fabricId) => {
    if (!fabricId) return "-";

    const fabric = fabrics.find(
      (item) => item.id === fabricId
    );

    if (!fabric) {
      return `Fabric #${fabricId}`;
    }

    return `${fabric.fabric_code} - ${fabric.name}`;
  };

  const getSalesOrderName = (salesOrderId) => {
    if (!salesOrderId) return "-";

    const salesOrder = salesOrders.find(
      (item) => item.id === salesOrderId
    );

    if (!salesOrder) {
      return `Sales Order #${salesOrderId}`;
    }

    return salesOrder.sales_order_no;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleItemChange = (
    index,
    event
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      items: previous.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [name]: value,
              }
            : item
      ),
    }));
  };

  const addProductionItem = () => {
    setFormData((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        createEmptyProductionItem(),
      ],
    }));
  };

  const removeProductionItem = (index) => {
    setFormData((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  };

  const resetForm = () => {
    setFormData(createInitialFormData());
    setEditingOrder(null);
    setError("");
  };

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const buildPayload = () => {
    return {
      production_order_no:
        formData.production_order_no.trim(),

      sales_order_id:
        formData.sales_order_id
          ? Number(formData.sales_order_id)
          : null,

      product_id: Number(formData.product_id),

      warehouse_id: Number(
        formData.warehouse_id
      ),

      planned_quantity: Number(
        formData.planned_quantity
      ),

      start_date:
        formData.start_date || null,

      expected_completion_date:
        formData.expected_completion_date ||
        null,

      actual_completion_date:
        formData.actual_completion_date ||
        null,

      status: formData.status,

      remarks:
        formData.remarks.trim() || null,

      items: formData.items.map((item) => ({
        yarn_id: item.yarn_id
          ? Number(item.yarn_id)
          : null,

        fabric_id: item.fabric_id
          ? Number(item.fabric_id)
          : null,

        planned_quantity: Number(
          item.planned_quantity
        ),

        consumed_quantity: Number(
          item.consumed_quantity || 0
        ),

        unit: item.unit,

        status: item.status,
      })),
    };
  };

  const validateForm = () => {
    if (
      !formData.production_order_no.trim()
    ) {
      return "Production order number is required.";
    }

    if (!formData.product_id) {
      return "Please select a product.";
    }

    if (!formData.warehouse_id) {
      return "Please select a finished goods warehouse.";
    }

    if (!formData.planned_quantity) {
      return "Planned quantity is required.";
    }

    if (
      Number(formData.planned_quantity) <= 0
    ) {
      return (
        "Planned quantity must be greater than zero."
      );
    }

    if (!formData.start_date) {
      return "Start date is required.";
    }

    if (
      formData.expected_completion_date &&
      formData.expected_completion_date <
        formData.start_date
    ) {
      return (
        "Expected completion date cannot be before the start date."
      );
    }

    if (!formData.items.length) {
      return (
        "At least one production item is required."
      );
    }

    for (
      let index = 0;
      index < formData.items.length;
      index += 1
    ) {
      const item = formData.items[index];

      if (
        !item.yarn_id &&
        !item.fabric_id
      ) {
        return `Production item ${
          index + 1
        }: select at least a Yarn or Fabric.`;
      }

      if (!item.planned_quantity) {
        return `Production item ${
          index + 1
        }: planned quantity is required.`;
      }

      if (
        Number(item.planned_quantity) <= 0
      ) {
        return `Production item ${
          index + 1
        }: planned quantity must be greater than zero.`;
      }

      if (
        Number(item.consumed_quantity || 0) <
        0
      ) {
        return `Production item ${
          index + 1
        }: consumed quantity cannot be negative.`;
      }

      if (
        Number(item.consumed_quantity || 0) >
        Number(item.planned_quantity)
      ) {
        return `Production item ${
          index + 1
        }: consumed quantity cannot exceed planned quantity.`;
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload();

    try {
      setSubmitting(true);

      const url = editingOrder
        ? `${API_BASE_URL}/api/production/${editingOrder.id}`
        : `${API_BASE_URL}/api/production/`;

      const method = editingOrder
        ? "PUT"
        : "POST";

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
          data.detail ||
            `Failed to ${
              editingOrder
                ? "update"
                : "create"
            } production order`
        );
      }

      await fetchProductionOrders();

      closeModal();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Something went wrong while saving the production order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = async (order) => {
    if (order.status === "Completed") {
      setPageError(
        "Completed production orders cannot be edited from the frontend because they are already connected to inventory movements."
      );
      return;
    }

    try {
      setError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/production/${order.id}/items`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch production items"
        );
      }

      const items = await response.json();

      setEditingOrder(order);

      setFormData({
        production_order_no:
          order.production_order_no || "",
        sales_order_id:
          order.sales_order_id
            ? String(order.sales_order_id)
            : "",
        product_id:
          order.product_id
            ? String(order.product_id)
            : "",
        warehouse_id:
          order.warehouse_id
            ? String(order.warehouse_id)
            : "",
        planned_quantity:
          order.planned_quantity !== null &&
          order.planned_quantity !== undefined
            ? String(order.planned_quantity)
            : "",
        start_date:
          order.start_date || "",
        expected_completion_date:
          order.expected_completion_date || "",
        actual_completion_date:
          order.actual_completion_date || "",
        status:
          order.status || "Planned",
        remarks:
          order.remarks || "",
        items:
          items.length
            ? items.map((item) => ({
                yarn_id: item.yarn_id
                  ? String(item.yarn_id)
                  : "",
                fabric_id: item.fabric_id
                  ? String(item.fabric_id)
                  : "",
                planned_quantity:
                  item.planned_quantity !==
                    null &&
                  item.planned_quantity !==
                    undefined
                    ? String(
                        item.planned_quantity
                      )
                    : "",
                consumed_quantity:
                  item.consumed_quantity !==
                    null &&
                  item.consumed_quantity !==
                    undefined
                    ? String(
                        item.consumed_quantity
                      )
                    : "0",
                unit: item.unit || "kg",
                status:
                  item.status || "Pending",
              }))
            : [createEmptyProductionItem()],
      });

      setShowModal(true);
    } catch (error) {
      console.error(error);

      setPageError(
        error.message ||
          "Unable to load production order details."
      );
    }
  };

  const openStatusModal = (order) => {
    if (order.status === "Completed") {
      setPageError(
        "This production order is already completed. Inventory output has already been processed."
      );
      return;
    }

    setSelectedOrder(order);

    setStatusData({
      status:
        order.status === "Planned"
          ? "In Progress"
          : "Completed",

      produced_quantity:
        order.produced_quantity !== null &&
        order.produced_quantity !== undefined
          ? String(order.produced_quantity)
          : "0",

      actual_completion_date:
        order.actual_completion_date || "",
    });

    setStatusError("");
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    if (updatingStatus) return;

    setShowStatusModal(false);
    setSelectedOrder(null);

    setStatusData({
      status: "Planned",
      produced_quantity: "",
      actual_completion_date: "",
    });

    setStatusError("");
  };

  const handleStatusChange = (event) => {
    const { name, value } = event.target;

    setStatusData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleStatusSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedOrder) return;

    setStatusError("");

    if (
      statusData.produced_quantity === ""
    ) {
      setStatusError(
        "Produced quantity is required."
      );
      return;
    }

    const producedQuantity = Number(
      statusData.produced_quantity
    );

    if (Number.isNaN(producedQuantity)) {
      setStatusError(
        "Produced quantity must be a valid number."
      );
      return;
    }

    if (producedQuantity < 0) {
      setStatusError(
        "Produced quantity cannot be negative."
      );
      return;
    }

    if (
      producedQuantity >
      Number(selectedOrder.planned_quantity)
    ) {
      setStatusError(
        "Produced quantity cannot be greater than planned quantity."
      );
      return;
    }

    if (
      statusData.status === "Completed" &&
      producedQuantity <= 0
    ) {
      setStatusError(
        "Produced quantity must be greater than zero when completing production."
      );
      return;
    }

    if (
      statusData.status === "Completed" &&
      !statusData.actual_completion_date
    ) {
      setStatusError(
        "Actual completion date is required when the order is completed."
      );
      return;
    }

    const payload = {
      status: statusData.status,
      produced_quantity: producedQuantity,
      actual_completion_date:
        statusData.actual_completion_date ||
        null,
    };

    try {
      setUpdatingStatus(true);

      const response = await apiFetch(
        `${API_BASE_URL}/api/production/${selectedOrder.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update production status"
        );
      }

      await fetchProductionOrders();

      closeStatusModal();
    } catch (error) {
      console.error(error);

      setStatusError(
        error.message ||
          "Something went wrong while updating the production order."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openItemsModal = async (order) => {
    try {
      setViewOrder(order);
      setViewItems([]);
      setItemsError("");
      setLoadingItems(true);
      setShowItemsModal(true);

      const response = await apiFetch(
        `${API_BASE_URL}/api/production/${order.id}/items`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to fetch production items"
        );
      }

      setViewItems(data);
    } catch (error) {
      console.error(error);

      setItemsError(
        error.message ||
          "Unable to load production items."
      );
    } finally {
      setLoadingItems(false);
    }
  };

  const closeItemsModal = () => {
    setShowItemsModal(false);
    setViewOrder(null);
    setViewItems([]);
    setItemsError("");
  };

  const handleDelete = async (order) => {
    if (order.status === "Completed") {
      setPageError(
        "Completed production orders cannot be deleted because they are connected to inventory movements."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete production order ${order.production_order_no}?`
    );

    if (!confirmed) return;

    try {
      setPageError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/production/${order.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to delete production order"
        );
      }

      await fetchProductionOrders();
    } catch (error) {
      console.error(error);

      setPageError(
        error.message ||
          "Unable to delete production order."
      );
    }
  };

  const filteredOrders = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim();

    if (!searchValue) {
      return productionOrders;
    }

    return productionOrders.filter(
      (order) => {
        const productName =
          getProductName(
            order.product_id
          ).toLowerCase();

        const warehouseName =
          getWarehouseName(
            order.warehouse_id
          ).toLowerCase();

        return (
          order.production_order_no
            ?.toLowerCase()
            .includes(searchValue) ||
          order.status
            ?.toLowerCase()
            .includes(searchValue) ||
          productName.includes(searchValue) ||
          warehouseName.includes(searchValue)
        );
      }
    );
  }, [
    productionOrders,
    search,
    products,
    warehouses,
  ]);

  const totalOrders =
    productionOrders.length;

  const plannedOrders =
    productionOrders.filter(
      (order) =>
        order.status === "Planned"
    ).length;

  const inProgressOrders =
    productionOrders.filter(
      (order) =>
        order.status === "In Progress"
    ).length;

  const completedOrders =
    productionOrders.filter(
      (order) =>
        order.status === "Completed"
    ).length;

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";

      case "In Progress":
        return "bg-blue-100 text-blue-700";

      case "Planned":
        return "bg-amber-100 text-amber-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Factory size={28} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Production
            </h1>

            <p className="mt-1 text-slate-600">
              Manage and monitor production
              orders
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={masterLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={19} />
            New Production Order
          </button>
        </div>
      </div>

      {/* ERROR */}
      {pageError && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span>{pageError}</span>

          <button
            type="button"
            onClick={() => setPageError("")}
            className="font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {/* MASTER DATA LOADING */}
      {masterLoading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-700">
          Loading products, warehouses,
          sales orders, yarns and fabrics...
        </div>
      )}

      {/* STATISTICS */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Production Orders
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Planned Orders
          </p>

          <p className="mt-3 text-3xl font-bold text-amber-600">
            {plannedOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            In Progress
          </p>

          <p className="mt-3 text-3xl font-bold text-blue-600">
            {inProgressOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Completed Orders
          </p>

          <p className="mt-3 text-3xl font-bold text-green-600">
            {completedOrders}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search by order, product, warehouse or status..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <p className="text-sm text-slate-500">
            Production flow: Planned →
            In Progress → Completed
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Production Order
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Product
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Warehouse
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Planned
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Produced
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Expected Completion
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Loading production orders...
                  </td>
                </tr>
              ) : filteredOrders.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No production orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <ClipboardList
                              size={19}
                            />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {
                                order.production_order_no
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Sales Order:{" "}
                              {getSalesOrderName(
                                order.sales_order_id
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-700">
                        {getProductName(
                          order.product_id
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-700">
                        {getWarehouseName(
                          order.warehouse_id
                        )}
                      </td>

                      <td className="px-6 py-5 font-medium text-slate-900">
                        {
                          order.planned_quantity
                        }
                      </td>

                      <td className="px-6 py-5 text-slate-700">
                        {
                          order.produced_quantity
                        }
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-700">
                        {formatDate(
                          order.expected_completion_date
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="View production items"
                            onClick={() =>
                              openItemsModal(
                                order
                              )
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            title="Edit production order"
                            onClick={() =>
                              openEditModal(
                                order
                              )
                            }
                            disabled={
                              order.status ===
                              "Completed"
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title={
                              order.status ===
                              "Completed"
                                ? "Production order already completed"
                                : "Update production status"
                            }
                            onClick={() =>
                              openStatusModal(
                                order
                              )
                            }
                            disabled={
                              order.status ===
                              "Completed"
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <RefreshCw
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete production order"
                            onClick={() =>
                              handleDelete(order)
                            }
                            disabled={
                              order.status ===
                              "Completed"
                            }
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2
                              size={16}
                            />
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

        {!loading && (
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            Showing {filteredOrders.length} of{" "}
            {productionOrders.length} production
            orders
          </div>
        )}
      </div>

      {/* CREATE / EDIT PRODUCTION ORDER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingOrder
                    ? "Edit Production Order"
                    : "New Production Order"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a connected production
                  order with raw material items
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ORDER DETAILS */}
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList
                    size={19}
                    className="text-slate-700"
                  />

                  <h3 className="font-bold text-slate-900">
                    Production Order Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Production Order Number *
                    </label>

                    <input
                      type="text"
                      name="production_order_no"
                      value={
                        formData.production_order_no
                      }
                      onChange={handleChange}
                      placeholder="Example: PROD-0002"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Sales Order
                    </label>

                    <select
                      name="sales_order_id"
                      value={
                        formData.sales_order_id
                      }
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    >
                      <option value="">
                        Select Sales Order
                        (Optional)
                      </option>

                      {salesOrders.map(
                        (salesOrder) => (
                          <option
                            key={
                              salesOrder.id
                            }
                            value={
                              salesOrder.id
                            }
                          >
                            {
                              salesOrder.sales_order_no
                            }{" "}
                            -{" "}
                            {
                              salesOrder.status
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Finished Product *
                    </label>

                    <select
                      name="product_id"
                      value={
                        formData.product_id
                      }
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    >
                      <option value="">
                        Select Product
                      </option>

                      {activeProducts.map(
                        (product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {
                              product.product_code
                            }{" "}
                            - {product.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Finished Goods Warehouse *
                    </label>

                    <select
                      name="warehouse_id"
                      value={
                        formData.warehouse_id
                      }
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    >
                      <option value="">
                        Select Warehouse
                      </option>

                      {activeWarehouses.map(
                        (warehouse) => (
                          <option
                            key={
                              warehouse.id
                            }
                            value={
                              warehouse.id
                            }
                          >
                            {
                              warehouse.warehouse_code
                            }{" "}
                            - {warehouse.name}
                          </option>
                        )
                      )}
                    </select>

                    <p className="mt-2 text-xs text-slate-500">
                      Completed production will
                      add the finished product to
                      this warehouse.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Planned Finished Quantity *
                    </label>

                    <input
                      type="number"
                      name="planned_quantity"
                      value={
                        formData.planned_quantity
                      }
                      onChange={handleChange}
                      placeholder="Example: 500"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Start Date *
                    </label>

                    <input
                      type="date"
                      name="start_date"
                      value={
                        formData.start_date
                      }
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Expected Completion Date
                    </label>

                    <input
                      type="date"
                      name="expected_completion_date"
                      value={
                        formData.expected_completion_date
                      }
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* PRODUCTION ITEMS */}
              <div className="border-t border-slate-200 pt-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package
                        size={19}
                        className="text-slate-700"
                      />

                      <h3 className="font-bold text-slate-900">
                        Production Materials
                      </h3>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Add the yarn and/or fabric
                      required for this production
                      order.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addProductionItem
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <PlusCircle
                      size={17}
                    />
                    Add Material
                  </button>
                </div>

                <div className="space-y-5">
                  {formData.items.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">
                              Material Item{" "}
                              {index + 1}
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              Select at least one
                              Yarn or Fabric
                            </p>
                          </div>

                          {formData.items
                            .length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeProductionItem(
                                  index
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              <Trash
                                size={15}
                              />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Yarn
                            </label>

                            <select
                              name="yarn_id"
                              value={
                                item.yarn_id
                              }
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                            >
                              <option value="">
                                Select Yarn
                                (Optional)
                              </option>

                              {activeYarns.map(
                                (yarn) => (
                                  <option
                                    key={
                                      yarn.id
                                    }
                                    value={
                                      yarn.id
                                    }
                                  >
                                    {
                                      yarn.yarn_code
                                    }{" "}
                                    - {yarn.name}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Fabric
                            </label>

                            <select
                              name="fabric_id"
                              value={
                                item.fabric_id
                              }
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                            >
                              <option value="">
                                Select Fabric
                                (Optional)
                              </option>

                              {activeFabrics.map(
                                (fabric) => (
                                  <option
                                    key={
                                      fabric.id
                                    }
                                    value={
                                      fabric.id
                                    }
                                  >
                                    {
                                      fabric.fabric_code
                                    }{" "}
                                    - {fabric.name}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Planned Quantity *
                            </label>

                            <input
                              type="number"
                              name="planned_quantity"
                              value={
                                item.planned_quantity
                              }
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              min="0.01"
                              step="0.01"
                              placeholder="Example: 300"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Consumed Quantity
                            </label>

                            <input
                              type="number"
                              name="consumed_quantity"
                              value={
                                item.consumed_quantity
                              }
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              min="0"
                              step="0.01"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Unit
                            </label>

                            <select
                              name="unit"
                              value={item.unit}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
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
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Item Status
                            </label>

                            <select
                              name="status"
                              value={
                                item.status
                              }
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  event
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                            >
                              <option value="Pending">
                                Pending
                              </option>

                              <option value="Consumed">
                                Consumed
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* REMARKS */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Remarks
                </label>

                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional production remarks..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              {/* ACTIONS */}
              <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingOrder
                    ? "Update Production Order"
                    : "Create Production Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PRODUCTION ITEMS MODAL */}
      {showItemsModal && viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Production Materials
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    viewOrder.production_order_no
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeItemsModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              {loadingItems ? (
                <div className="py-10 text-center text-slate-500">
                  Loading production items...
                </div>
              ) : itemsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {itemsError}
                </div>
              ) : viewItems.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No production items found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Yarn
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Fabric
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Planned
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Consumed
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Unit
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {viewItems.map(
                        (item) => (
                          <tr
                            key={item.id}
                          >
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {getYarnName(
                                item.yarn_id
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {getFabricName(
                                item.fabric_id
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {
                                item.planned_quantity
                              }
                            </td>

                            <td className="px-4 py-4">
                              {
                                item.consumed_quantity
                              }
                            </td>

                            <td className="px-4 py-4">
                              {item.unit}
                            </td>

                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {showStatusModal &&
        selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Update Production Status
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      selectedOrder.production_order_no
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeStatusModal
                  }
                  disabled={
                    updatingStatus
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={22} />
                </button>
              </div>

              <form
                onSubmit={
                  handleStatusSubmit
                }
                className="p-6"
              >
                {statusError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {statusError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Current Status
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                      {
                        selectedOrder.status
                      }
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Next Status
                    </label>

                    <select
                      name="status"
                      value={
                        statusData.status
                      }
                      onChange={
                        handleStatusChange
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    >
                      {selectedOrder.status ===
                      "Planned" ? (
                        <>
                          <option value="In Progress">
                            In Progress
                          </option>

                          <option value="Completed">
                            Completed
                          </option>
                        </>
                      ) : (
                        <option value="Completed">
                          Completed
                        </option>
                      )}
                    </select>

                    <p className="mt-2 text-xs text-slate-500">
                      Production follows Planned
                      → In Progress → Completed.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Produced Quantity *
                    </label>

                    <input
                      type="number"
                      name="produced_quantity"
                      value={
                        statusData.produced_quantity
                      }
                      onChange={
                        handleStatusChange
                      }
                      min="0"
                      max={
                        selectedOrder.planned_quantity
                      }
                      step="0.01"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Planned quantity:{" "}
                      {
                        selectedOrder.planned_quantity
                      }
                    </p>
                  </div>

                  {statusData.status ===
                    "Completed" && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Actual Completion Date *
                      </label>

                      <input
                        type="date"
                        name="actual_completion_date"
                        value={
                          statusData.actual_completion_date
                        }
                        onChange={
                          handleStatusChange
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        Completing the order will
                        process finished goods
                        inventory through the
                        backend.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={
                      closeStatusModal
                    }
                    disabled={
                      updatingStatus
                    }
                    className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      updatingStatus
                    }
                    className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingStatus
                      ? "Updating..."
                      : "Update Status"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}