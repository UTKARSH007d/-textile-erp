"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useMemo, useState } from "react";

import {
  Palette,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Droplets,
  CheckCircle2,
  Clock3,
  Factory,
  ArrowRight,
  PackageCheck,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

// =========================================================
// INITIAL FORM
// =========================================================

const createInitialForm = () => ({
  process_no: "",
  process_type: "Dyeing",

  production_order_id: "",
  product_id: "",
  fabric_id: "",
  color_id: "",

  process_date: new Date().toISOString().split("T")[0],
  expected_completion_date: "",

  input_quantity: "",
  output_quantity: "",
  rejected_quantity: "0",

  unit: "meter",

  color_name: "",
  shade: "",
  dye_lot_no: "",

  finishing_type: "",

  status: "Planned",

  operator_name: "",
  remarks: "",

  active: true,
});

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function DyeingFinishingPage() {
  const [activeTab, setActiveTab] = useState("Dyeing");

  const [processes, setProcesses] = useState([]);

  const [productionOrders, setProductionOrders] =
    useState([]);

  const [products, setProducts] = useState([]);

  const [fabrics, setFabrics] = useState([]);

  const [colors, setColors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [masterLoading, setMasterLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingProcess, setEditingProcess] =
    useState(null);

  const [formData, setFormData] =
    useState(createInitialForm());

  const [formError, setFormError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchProcesses(),
      fetchMasterData(),
    ]);
  };

  // =========================================================
  // LOAD PROCESSES
  // =========================================================

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/dyeing-finishing/`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load dyeing and finishing processes."
        );
      }

      const data = await response.json();

      setProcesses(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Error loading processes:",
        error
      );

      setProcesses([]);

      setPageError(
        error.message ||
          "Unable to load dyeing and finishing processes."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD MASTER DATA
  // =========================================================

  const fetchMasterData = async () => {
    try {
      setMasterLoading(true);

      const [
        productionResponse,
        productsResponse,
        fabricsResponse,
        colorsResponse,
      ] = await Promise.all([
        apiFetch(
          `${API_BASE_URL}/api/production/`
        ),

        apiFetch(
          `${API_BASE_URL}/api/products/`
        ),

        apiFetch(
          `${API_BASE_URL}/api/fabrics/`
        ),

        apiFetch(
          `${API_BASE_URL}/api/colors/`
        ),
      ]);

      const responses = [
        productionResponse,
        productsResponse,
        fabricsResponse,
        colorsResponse,
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
        productionData,
        productsData,
        fabricsData,
        colorsData,
      ] = await Promise.all(
        responses.map((response) =>
          response.json()
        )
      );

      setProductionOrders(
        Array.isArray(productionData)
          ? productionData
          : []
      );

      setProducts(
        Array.isArray(productsData)
          ? productsData
          : []
      );

      setFabrics(
        Array.isArray(fabricsData)
          ? fabricsData
          : []
      );

      setColors(
        Array.isArray(colorsData)
          ? colorsData
          : []
      );
    } catch (error) {
      console.error(
        "Error loading master data:",
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

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {
    await loadInitialData();
  };

  // =========================================================
  // ACTIVE MASTER RECORDS
  // =========================================================

  const getActiveRecords = (records) => {
    return records.filter((record) => {
      if (
        record.status === false ||
        record.active === false
      ) {
        return false;
      }

      return true;
    });
  };

  const activeProductionOrders =
    getActiveRecords(productionOrders);

  const activeProducts =
    getActiveRecords(products);

  const activeFabrics =
    getActiveRecords(fabrics);

  const activeColors =
    getActiveRecords(colors);

  // =========================================================
  // GET DISPLAY NAMES
  // =========================================================

  const getProductionOrderName = (
    productionOrderId
  ) => {
    if (!productionOrderId) {
      return "-";
    }

    const productionOrder =
      productionOrders.find(
        (order) =>
          Number(order.id) ===
          Number(productionOrderId)
      );

    if (!productionOrder) {
      return `Production Order #${productionOrderId}`;
    }

    return (
      productionOrder.production_order_no ||
      productionOrder.order_no ||
      `Production Order #${productionOrderId}`
    );
  };

  const getProductName = (productId) => {
    if (!productId) {
      return "-";
    }

    const product = products.find(
      (item) =>
        Number(item.id) === Number(productId)
    );

    if (!product) {
      return `Product #${productId}`;
    }

    return (
      `${product.product_code || ""} ${
        product.name || ""
      }`.trim() ||
      `Product #${productId}`
    );
  };

  const getFabricName = (fabricId) => {
    if (!fabricId) {
      return "-";
    }

    const fabric = fabrics.find(
      (item) =>
        Number(item.id) === Number(fabricId)
    );

    if (!fabric) {
      return `Fabric #${fabricId}`;
    }

    return (
      `${fabric.fabric_code || ""} ${
        fabric.name || ""
      }`.trim() ||
      `Fabric #${fabricId}`
    );
  };

  const getColorName = (colorId) => {
    if (!colorId) {
      return "-";
    }

    const color = colors.find(
      (item) =>
        Number(item.id) === Number(colorId)
    );

    if (!color) {
      return `Color #${colorId}`;
    }

    return color.name || `Color #${colorId}`;
  };

  // =========================================================
  // CURRENT TAB PROCESSES
  // =========================================================

  const currentProcesses = useMemo(() => {
    return processes.filter(
      (process) =>
        process.process_type === activeTab
    );
  }, [processes, activeTab]);

  // =========================================================
  // FILTERED PROCESSES
  // =========================================================

  const filteredProcesses = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    if (!searchValue) {
      return currentProcesses;
    }

    return currentProcesses.filter(
      (process) => {
        const values = [
          process.process_no,

          process.process_type,

          process.status,

          process.color_name,

          process.shade,

          process.dye_lot_no,

          process.finishing_type,

          process.operator_name,

          getProductionOrderName(
            process.production_order_id
          ),

          getProductName(
            process.product_id
          ),

          getFabricName(
            process.fabric_id
          ),

          getColorName(
            process.color_id
          ),
        ];

        return values
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(searchValue)
          );
      }
    );
  }, [
    currentProcesses,
    search,
    productionOrders,
    products,
    fabrics,
    colors,
  ]);

  // =========================================================
  // STATUS COUNT
  // =========================================================

  const getStatusCount = (status) => {
    return currentProcesses.filter(
      (process) =>
        process.status === status
    ).length;
  };

  // =========================================================
  // OPEN CREATE MODAL
  // =========================================================

  const openCreateModal = () => {
    setEditingProcess(null);

    setFormError("");

    setFormData({
      ...createInitialForm(),
      process_type: activeTab,
    });

    setShowModal(true);
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (process) => {
    setEditingProcess(process);

    setFormError("");

    setFormData({
      process_no:
        process.process_no || "",

      process_type:
        process.process_type || activeTab,

      production_order_id:
        process.production_order_id
          ? String(
              process.production_order_id
            )
          : "",

      product_id:
        process.product_id
          ? String(process.product_id)
          : "",

      fabric_id:
        process.fabric_id
          ? String(process.fabric_id)
          : "",

      color_id:
        process.color_id
          ? String(process.color_id)
          : "",

      process_date:
        process.process_date || "",

      expected_completion_date:
        process.expected_completion_date ||
        "",

      input_quantity:
        process.input_quantity ??
        "",

      output_quantity:
        process.output_quantity ??
        "",

      rejected_quantity:
        process.rejected_quantity ??
        "0",

      unit:
        process.unit || "meter",

      color_name:
        process.color_name || "",

      shade:
        process.shade || "",

      dye_lot_no:
        process.dye_lot_no || "",

      finishing_type:
        process.finishing_type || "",

      status:
        process.status || "Planned",

      operator_name:
        process.operator_name || "",

      remarks:
        process.remarks || "",

      active:
        process.active !== false,
    });

    setShowModal(true);
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setShowModal(false);

    setEditingProcess(null);

    setFormError("");
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =========================================================
  // AUTO UPDATE COLOR NAME
  // =========================================================

  const handleColorChange = (event) => {
    const selectedColorId =
      event.target.value;

    const selectedColor =
      colors.find(
        (color) =>
          Number(color.id) ===
          Number(selectedColorId)
      );

    setFormData((previous) => ({
      ...previous,

      color_id: selectedColorId,

      color_name:
        selectedColor?.name || "",
    }));
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (!formData.process_no.trim()) {
      return "Process number is required.";
    }

    if (!formData.process_date) {
      return "Process date is required.";
    }

    if (!formData.input_quantity) {
      return "Input quantity is required.";
    }

    const inputQuantity = Number(
      formData.input_quantity
    );

    const outputQuantity = Number(
      formData.output_quantity || 0
    );

    const rejectedQuantity = Number(
      formData.rejected_quantity || 0
    );

    if (inputQuantity <= 0) {
      return (
        "Input quantity must be greater than zero."
      );
    }

    if (outputQuantity < 0) {
      return (
        "Output quantity cannot be negative."
      );
    }

    if (rejectedQuantity < 0) {
      return (
        "Rejected quantity cannot be negative."
      );
    }

    if (
      outputQuantity +
        rejectedQuantity >
      inputQuantity
    ) {
      return (
        "Output quantity + rejected quantity cannot be greater than input quantity."
      );
    }

    if (
      formData.expected_completion_date &&
      formData.expected_completion_date <
        formData.process_date
    ) {
      return (
        "Expected completion date cannot be before the process date."
      );
    }

    if (
      activeTab === "Dyeing" &&
      !formData.fabric_id
    ) {
      return (
        "Please select a fabric for dyeing."
      );
    }

    if (
      activeTab === "Dyeing" &&
      !formData.color_id
    ) {
      return (
        "Please select a color for dyeing."
      );
    }

    if (
      activeTab === "Finishing" &&
      !formData.finishing_type.trim()
    ) {
      return (
        "Finishing type is required."
      );
    }

    return "";
  };

  // =========================================================
  // BUILD PAYLOAD
  // =========================================================

  const buildPayload = () => {
    return {
      process_no:
        formData.process_no.trim(),

      process_type:
        activeTab,

      production_order_id:
        formData.production_order_id
          ? Number(
              formData.production_order_id
            )
          : null,

      product_id:
        formData.product_id
          ? Number(
              formData.product_id
            )
          : null,

      fabric_id:
        formData.fabric_id
          ? Number(
              formData.fabric_id
            )
          : null,

      color_id:
        activeTab === "Dyeing" &&
        formData.color_id
          ? Number(formData.color_id)
          : null,

      process_date:
        formData.process_date,

      expected_completion_date:
        formData.expected_completion_date ||
        null,

      input_quantity:
        Number(
          formData.input_quantity
        ),

      output_quantity:
        Number(
          formData.output_quantity || 0
        ),

      rejected_quantity:
        Number(
          formData.rejected_quantity || 0
        ),

      unit:
        formData.unit || "meter",

      color_name:
        activeTab === "Dyeing"
          ? formData.color_name.trim() ||
            null
          : null,

      shade:
        activeTab === "Dyeing"
          ? formData.shade.trim() || null
          : null,

      dye_lot_no:
        activeTab === "Dyeing"
          ? formData.dye_lot_no.trim() ||
            null
          : null,

      finishing_type:
        activeTab === "Finishing"
          ? formData.finishing_type.trim()
          : null,

      status:
        formData.status,

      operator_name:
        formData.operator_name.trim() ||
        null,

      remarks:
        formData.remarks.trim() || null,

      active:
        formData.active,
    };
  };

  // =========================================================
  // CREATE / UPDATE
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(validationError);

      return;
    }

    const payload = buildPayload();

    const url = editingProcess
      ? `${API_BASE_URL}/api/dyeing-finishing/${editingProcess.id}`
      : `${API_BASE_URL}/api/dyeing-finishing/`;

    const method = editingProcess
      ? "PUT"
      : "POST";

    try {
      setSubmitting(true);

      const response = await apiFetch(url, {
        method,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Failed to ${
              editingProcess
                ? "update"
                : "create"
            } process.`
        );
      }

      await fetchProcesses();

      setShowModal(false);

      setEditingProcess(null);

      setFormError("");
    } catch (error) {
      console.error(
        "Error saving process:",
        error
      );

      setFormError(
        error.message ||
          "Something went wrong while saving the process."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (process) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${process.process_no}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/dyeing-finishing/${process.id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to delete process."
        );
      }

      await fetchProcesses();
    } catch (error) {
      console.error(
        "Error deleting process:",
        error
      );

      setPageError(
        error.message ||
          "Unable to delete process."
      );
    }
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Completed") {
      return (
        "border-emerald-200 bg-emerald-50 text-emerald-700"
      );
    }

    if (status === "In Progress") {
      return (
        "border-blue-200 bg-blue-50 text-blue-700"
      );
    }

    return (
      "border-amber-200 bg-amber-50 text-amber-700"
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            {activeTab === "Dyeing" ? (
              <Palette size={30} />
            ) : (
              <Sparkles size={30} />
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dyeing & Finishing
            </h1>

            <p className="mt-1 text-slate-500">
              Manage textile dyeing and finishing processes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              loading ||
              masterLoading
            }
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={masterLoading}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={19} />

            New Process
          </button>
        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("Dyeing");
            setSearch("");
          }}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            activeTab === "Dyeing"
              ? "bg-slate-900 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Droplets size={18} />

          Dyeing
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("Finishing");
            setSearch("");
          }}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            activeTab === "Finishing"
              ? "bg-slate-900 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={18} />

          Finishing
        </button>
      </div>

      {/* =====================================================
          PROCESS FLOW
      ===================================================== */}

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
        <Factory size={18} />

        <span>
          Production
        </span>

        <ArrowRight size={16} />

        <span className="font-semibold">
          Dyeing
        </span>

        <ArrowRight size={16} />

        <span className="font-semibold">
          Finishing
        </span>

        <ArrowRight size={16} />

        <span>
          Quality Check
        </span>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={`Total ${activeTab} Processes`}
          value={currentProcesses.length}
          icon={
            activeTab === "Dyeing" ? (
              <Droplets size={24} />
            ) : (
              <Sparkles size={24} />
            )
          }
          iconClass="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          title="Planned"
          value={getStatusCount(
            "Planned"
          )}
          icon={<Clock3 size={24} />}
          iconClass="bg-amber-50 text-amber-600"
        />

        <SummaryCard
          title="In Progress"
          value={getStatusCount(
            "In Progress"
          )}
          icon={<Factory size={24} />}
          iconClass="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Completed"
          value={getStatusCount(
            "Completed"
          )}
          icon={
            <CheckCircle2 size={24} />
          }
          iconClass="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {pageError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeTab} Processes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track and manage textile processing operations
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search process, production, fabric or status..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Process
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Production
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fabric
                </th>

                {activeTab ===
                  "Dyeing" && (
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Color
                  </th>
                )}

                {activeTab ===
                  "Finishing" && (
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Finishing Type
                  </th>
                )}

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Input
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Output
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Loading processes...
                  </td>
                </tr>
              ) : filteredProcesses.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No {activeTab.toLowerCase()} processes found.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map(
                  (process) => (
                    <tr
                      key={process.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">
                          {process.process_no}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {process.process_date}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {getProductionOrderName(
                          process.production_order_id
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {getProductName(
                          process.product_id
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {getFabricName(
                          process.fabric_id
                        )}
                      </td>

                      {activeTab ===
                        "Dyeing" && (
                        <td className="px-6 py-5 text-sm text-slate-600">
                          <div>
                            {process.color_name ||
                              getColorName(
                                process.color_id
                              )}
                          </div>

                          {process.shade && (
                            <div className="mt-1 text-xs text-slate-400">
                              Shade:{" "}
                              {process.shade}
                            </div>
                          )}
                        </td>
                      )}

                      {activeTab ===
                        "Finishing" && (
                        <td className="px-6 py-5 text-sm text-slate-600">
                          {process.finishing_type ||
                            "-"}
                        </td>
                      )}

                      <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                        {process.input_quantity}{" "}
                        {process.unit}
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-semibold text-emerald-700">
                          {process.output_quantity}{" "}
                          {process.unit}
                        </div>

                        {Number(
                          process.rejected_quantity ||
                            0
                        ) > 0 && (
                          <div className="mt-1 text-xs text-red-500">
                            Rejected:{" "}
                            {
                              process.rejected_quantity
                            }
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusClass(
                            process.status
                          )}`}
                        >
                          {process.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            title="Edit process"
                            onClick={() =>
                              openEditModal(
                                process
                              )
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            title="Delete process"
                            onClick={() =>
                              handleDelete(
                                process
                              )
                            }
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={16} />
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
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
            Showing{" "}
            {filteredProcesses.length} of{" "}
            {currentProcesses.length}{" "}
            {activeTab.toLowerCase()} processes
          </div>
        )}
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProcess
                    ? `Edit ${activeTab} Process`
                    : `New ${activeTab} Process`}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter textile processing details
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={21} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >
              {formError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {masterLoading && (
                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Loading dropdown data...
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                {/* PROCESS NUMBER */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Process Number *
                  </label>

                  <input
                    type="text"
                    name="process_no"
                    value={
                      formData.process_no
                    }
                    onChange={handleChange}
                    placeholder={
                      activeTab === "Dyeing"
                        ? "DF-001"
                        : "FIN-001"
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* PROCESS TYPE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Process Type
                  </label>

                  <input
                    value={activeTab}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600"
                  />
                </div>

                {/* PRODUCTION ORDER */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Production Order
                  </label>

                  <select
                    name="production_order_id"
                    value={
                      formData.production_order_id
                    }
                    onChange={handleChange}
                    disabled={masterLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Production Order
                    </option>

                    {activeProductionOrders.map(
                      (order) => (
                        <option
                          key={order.id}
                          value={order.id}
                        >
                          {order.production_order_no}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* PRODUCT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Product
                  </label>

                  <select
                    name="product_id"
                    value={
                      formData.product_id
                    }
                    onChange={handleChange}
                    disabled={masterLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
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
                          {product.product_code} -{" "}
                          {product.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* FABRIC */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Fabric{" "}
                    {activeTab === "Dyeing"
                      ? "*"
                      : ""}
                  </label>

                  <select
                    name="fabric_id"
                    value={
                      formData.fabric_id
                    }
                    onChange={handleChange}
                    disabled={masterLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Fabric
                    </option>

                    {activeFabrics.map(
                      (fabric) => (
                        <option
                          key={fabric.id}
                          value={fabric.id}
                        >
                          {fabric.fabric_code} -{" "}
                          {fabric.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* COLOR */}

                {activeTab ===
                  "Dyeing" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Color *
                    </label>

                    <select
                      value={
                        formData.color_id
                      }
                      onChange={
                        handleColorChange
                      }
                      disabled={
                        masterLoading
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="">
                        Select Color
                      </option>

                      {activeColors.map(
                        (color) => (
                          <option
                            key={color.id}
                            value={color.id}
                          >
                            {color.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                {/* SHADE */}

                {activeTab ===
                  "Dyeing" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Shade
                    </label>

                    <input
                      type="text"
                      name="shade"
                      value={
                        formData.shade
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: Dark"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                )}

                {/* DYE LOT */}

                {activeTab ===
                  "Dyeing" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Dye Lot Number
                    </label>

                    <input
                      type="text"
                      name="dye_lot_no"
                      value={
                        formData.dye_lot_no
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: DL-2026-001"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                )}

                {/* FINISHING TYPE */}

                {activeTab ===
                  "Finishing" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Finishing Type *
                    </label>

                    <input
                      type="text"
                      name="finishing_type"
                      value={
                        formData.finishing_type
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: Soft Finish"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                )}

                {/* PROCESS DATE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Process Date *
                  </label>

                  <input
                    type="date"
                    name="process_date"
                    value={
                      formData.process_date
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* EXPECTED COMPLETION */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expected Completion
                  </label>

                  <input
                    type="date"
                    name="expected_completion_date"
                    value={
                      formData.expected_completion_date
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* INPUT QUANTITY */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Input Quantity *
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="input_quantity"
                    value={
                      formData.input_quantity
                    }
                    onChange={handleChange}
                    placeholder="Enter input quantity"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* OUTPUT QUANTITY */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Output Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="output_quantity"
                    value={
                      formData.output_quantity
                    }
                    onChange={handleChange}
                    placeholder="Enter output quantity"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* REJECTED QUANTITY */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Rejected Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="rejected_quantity"
                    value={
                      formData.rejected_quantity
                    }
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* UNIT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Unit
                  </label>

                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="meter">
                      Meter
                    </option>

                    <option value="kg">
                      Kg
                    </option>

                    <option value="piece">
                      Piece
                    </option>

                    <option value="roll">
                      Roll
                    </option>
                  </select>
                </div>

                {/* STATUS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="Planned">
                      Planned
                    </option>

                    <option value="In Progress">
                      In Progress
                    </option>

                    <option value="Completed">
                      Completed
                    </option>
                  </select>
                </div>

                {/* OPERATOR */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Operator Name
                  </label>

                  <input
                    type="text"
                    name="operator_name"
                    value={
                      formData.operator_name
                    }
                    onChange={handleChange}
                    placeholder="Enter operator name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* REMARKS */}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Remarks
                </label>

                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add processing notes or remarks..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* ACTIVE */}

              <label className="mt-5 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-4 w-4"
                />

                Active Process
              </label>

              {/* BUTTONS */}

              <div className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    masterLoading
                  }
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : editingProcess ? (
                    "Update Process"
                  ) : (
                    "Create Process"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
  icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}